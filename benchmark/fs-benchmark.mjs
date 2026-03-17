#!/usr/bin/env node
/**
 * File System Benchmark: Node.js fs vs Rush-FS
 *
 * 测试场景：
 * 1. readdir 递归扫描（模拟代码库扫描）
 * 2. 批量 readFile（模拟文档生成）
 * 3. 混合操作（真实工作负载）
 */

import { mkdir, writeFile, rm, readdir as nodeReaddir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { statSync } from "node:fs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const TEST_DIR = resolve(__dirname, "../benchmark/test-data");

// 动态导入 Rush-FS（如果可用）
let rushFs = null;
try {
  rushFs = await import("@rush-fs/core");
  console.log("✅ Rush-FS 可用");
} catch {
  console.log("⚠️  Rush-FS 不可用，仅测试 Node.js fs");
}

// 工具函数
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / k ** i) * 100) / 100 + " " + sizes[i];
}

function formatDuration(ms) {
  if (ms < 1) return `${(ms * 1000).toFixed(0)} µs`;
  if (ms < 1000) return `${ms.toFixed(2)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

// 内存监控
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    rss: usage.rss,
  };
}

function formatMemory(bytes) {
  return formatBytes(bytes);
}

// 测试数据结构
class BenchmarkResult {
  constructor(name) {
    this.name = name;
    this.results = [];
  }

  addRun(duration, memoryBefore, memoryAfter) {
    this.results.push({
      duration,
      memoryDelta: memoryAfter.heapUsed - memoryBefore.heapUsed,
      memoryPeak: memoryAfter.heapUsed,
    });
  }

  getStats() {
    if (this.results.length === 0) return null;

    const durations = this.results.map((r) => r.duration);
    const memoryDeltas = this.results.map((r) => r.memoryDelta);
    const memoryPeaks = this.results.map((r) => r.memoryPeak);

    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const min = (arr) => Math.min(...arr);
    const max = (arr) => Math.max(...arr);

    return {
      duration: {
        avg: avg(durations),
        min: min(durations),
        max: max(durations),
      },
      memory: {
        deltaAvg: avg(memoryDeltas),
        deltaMax: max(memoryDeltas),
        peakAvg: avg(memoryPeaks),
        peakMax: max(memoryPeaks),
      },
      runs: this.results.length,
    };
  }
}

// 创建测试数据
async function setupTestData() {
  console.log("\n📦 准备测试数据...");

  await rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  await mkdir(TEST_DIR, { recursive: true });

  // 创建目录结构：breadth=5, depth=3
  // 总计约 5 + 25 + 125 = 155 个目录
  const filesPerDir = 10;
  let totalFiles = 0;

  async function createTree(path, depth) {
    if (depth === 0) return;

    for (let i = 0; i < 5; i++) {
      const dirPath = join(path, `dir-${i}`);
      await mkdir(dirPath, { recursive: true });

      // 创建文件
      for (let j = 0; j < filesPerDir; j++) {
        const filePath = join(dirPath, `file-${j}.txt`);
        const content = `File content ${j}\n`.repeat(100); // ~1.5KB per file
        await writeFile(filePath, content);
        totalFiles++;
      }

      await createTree(dirPath, depth - 1);
    }
  }

  await createTree(TEST_DIR, 3);

  // 计算总大小
  let totalSize = 0;
  async function calcSize(dir) {
    const entries = await nodeReaddir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await calcSize(fullPath);
      } else {
        totalSize += statSync(fullPath).size;
      }
    }
  }
  await calcSize(TEST_DIR);

  console.log(
    `✅ 创建完成：${totalFiles} 个文件，总大小 ${formatBytes(totalSize)}`,
  );
  return { totalFiles, totalSize };
}

// 测试 1: readdir 递归扫描
async function benchmarkReaddirRecursive() {
  console.log("\n📁 测试 1: readdir 递归扫描");

  const nodeResult = new BenchmarkResult("Node.js fs");
  const rushResult = new BenchmarkResult("Rush-FS");

  // Node.js fs
  async function nodeReaddirRecursive(dir) {
    const entries = await nodeReaddir(dir, { withFileTypes: true });
    const results = [];

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...(await nodeReaddirRecursive(fullPath)));
      } else {
        results.push(entry.name);
      }
    }

    return results;
  }

  // Rush-FS
  async function rushReaddirRecursive(dir) {
    const entries = await rushFs.readdir(dir, { withFileTypes: true });
    const results = [];

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...(await rushReaddirRecursive(fullPath)));
      } else {
        results.push(entry.name);
      }
    }

    return results;
  }

  // 运行测试 (各 5 次)
  const runs = 5;
  console.log(`   运行 ${runs} 次...`);

  for (let i = 0; i < runs; i++) {
    // Node.js
    let memBefore = getMemoryUsage();
    let start = performance.now();
    await nodeReaddirRecursive(TEST_DIR);
    let end = performance.now();
    let memAfter = getMemoryUsage();
    nodeResult.addRun(end - start, memBefore, memAfter);

    // Rush-FS
    if (rushFs) {
      memBefore = getMemoryUsage();
      start = performance.now();
      await rushReaddirRecursive(TEST_DIR);
      end = performance.now();
      memAfter = getMemoryUsage();
      rushResult.addRun(end - start, memBefore, memAfter);
    }
  }

  // 输出结果
  const nodeStats = nodeResult.getStats();
  const rushStats = rushResult.getStats();

  console.log("\n   结果:");
  console.log(
    `   ┌─────────────┬──────────────┬──────────────┬──────────────┐`,
  );
  console.log(
    `   │ 指标        │ Node.js fs   │ Rush-FS      │ 提升         │`,
  );
  console.log(
    `   ├─────────────┼──────────────┼──────────────┼──────────────┤`,
  );
  console.log(
    `   │ 平均时间    │ ${formatDuration(nodeStats.duration.avg).padEnd(12)} │ ${rushStats ? formatDuration(rushStats.duration.avg).padEnd(12) : "N/A"} │ ${rushStats ? ((nodeStats.duration.avg / rushStats.duration.avg).toFixed(2) + "x").padEnd(12) : "N/A"} │`,
  );
  console.log(
    `   │ 最快时间    │ ${formatDuration(nodeStats.duration.min).padEnd(12)} │ ${rushStats ? formatDuration(rushStats.duration.min).padEnd(12) : "N/A"} │ ${rushStats ? ((nodeStats.duration.min / rushStats.duration.min).toFixed(2) + "x").padEnd(12) : "N/A"} │`,
  );
  console.log(
    `   │ 内存增量    │ ${formatMemory(nodeStats.memory.deltaAvg).padEnd(12)} │ ${rushStats ? formatMemory(rushStats.memory.deltaAvg).padEnd(12) : "N/A"} │ ${rushStats ? ((nodeStats.memory.deltaAvg / rushStats.memory.deltaAvg).toFixed(2) + "x").padEnd(12) : "N/A"} │`,
  );
  console.log(
    `   └─────────────┴──────────────┴──────────────┴──────────────┘`,
  );

  return { node: nodeStats, rush: rushStats };
}

// 测试 2: 批量 readFile
async function benchmarkReadFile() {
  console.log("\n📄 测试 2: 批量 readFile (100 个文件)");

  // 获取文件列表
  async function getAllFiles(dir) {
    const entries = await nodeReaddir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await getAllFiles(fullPath)));
      } else {
        files.push(fullPath);
      }
    }
    return files;
  }

  const allFiles = await getAllFiles(TEST_DIR);
  const testFiles = allFiles.slice(0, 100); // 取前 100 个文件

  const nodeResult = new BenchmarkResult("Node.js fs");
  const rushResult = new BenchmarkResult("Rush-FS");

  const runs = 5;
  console.log(`   运行 ${runs} 次...`);

  for (let i = 0; i < runs; i++) {
    // Node.js
    let memBefore = getMemoryUsage();
    let start = performance.now();
    await Promise.all(
      testFiles.map((f) => writeFile(f, "", { flag: "r+" }).catch(() => {})),
    ); // touch
    await Promise.all(
      testFiles.map((f) =>
        import("node:fs/promises").then((fs) => fs.readFile(f, "utf-8")),
      ),
    );
    let end = performance.now();
    let memAfter = getMemoryUsage();
    nodeResult.addRun(end - start, memBefore, memAfter);

    // Rush-FS
    if (rushFs) {
      memBefore = getMemoryUsage();
      start = performance.now();
      await Promise.all(testFiles.map((f) => rushFs.readFile(f, "utf-8")));
      end = performance.now();
      memAfter = getMemoryUsage();
      rushResult.addRun(end - start, memBefore, memAfter);
    }
  }

  const nodeStats = nodeResult.getStats();
  const rushStats = rushResult.getStats();

  console.log("\n   结果:");
  console.log(
    `   ┌─────────────┬──────────────┬──────────────┬──────────────┐`,
  );
  console.log(
    `   │ 指标        │ Node.js fs   │ Rush-FS      │ 提升         │`,
  );
  console.log(
    `   ├─────────────┼──────────────┼──────────────┼──────────────┤`,
  );
  console.log(
    `   │ 平均时间    │ ${formatDuration(nodeStats.duration.avg).padEnd(12)} │ ${rushStats ? formatDuration(rushStats.duration.avg).padEnd(12) : "N/A"} │ ${rushStats ? ((nodeStats.duration.avg / rushStats.duration.avg).toFixed(2) + "x").padEnd(12) : "N/A"} │`,
  );
  console.log(
    `   │ 内存增量    │ ${formatMemory(nodeStats.memory.deltaAvg).padEnd(12)} │ ${rushStats ? formatMemory(rushStats.memory.deltaAvg).padEnd(12) : "N/A"} │ ${rushStats ? ((nodeStats.memory.deltaAvg / rushStats.memory.deltaAvg).toFixed(2) + "x").padEnd(12) : "N/A"} │`,
  );
  console.log(
    `   └─────────────┴──────────────┴──────────────┴──────────────┘`,
  );

  return { node: nodeStats, rush: rushStats };
}

// 主函数
async function main() {
  console.log("🚀 File System Benchmark");
  console.log("========================");
  console.log(`Node.js: ${process.version}`);
  console.log(`Platform: ${process.platform} ${process.arch}`);
  console.log(`Rush-FS: ${rushFs ? "✅" : "❌"}`);

  await setupTestData();

  const results = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    rushFsVersion: rushFs ? "0.1.0" : "N/A",
    tests: {},
  };

  results.tests.readdir = await benchmarkReaddirRecursive();
  results.tests.readFile = await benchmarkReadFile();

  // 清理
  await rm(TEST_DIR, { recursive: true, force: true });
  console.log("\n🧹 测试数据已清理");

  // 输出 JSON 结果
  console.log("\n📊 JSON 结果:");
  console.log(JSON.stringify(results, null, 2));

  // 保存到文件
  const outputFile = join(__dirname, `benchmark-${Date.now()}.json`);
  await writeFile(outputFile, JSON.stringify(results, null, 2));
  console.log(`\n💾 结果已保存：${outputFile}`);
}

main().catch(console.error);
