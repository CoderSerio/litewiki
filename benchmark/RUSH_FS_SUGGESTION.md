# Rush-FS 智能降级优化建议

**提交给**: https://github.com/CoderSerio/rush-fs  
**类型**: 性能优化建议 / Feature Request  
**优先级**: 🟡 中（影响小规模场景体验）

---

## 📊 问题背景

在 LiteWiki 项目的 Rush-FS 集成 benchmark 测试中，发现了一个性能问题：

### 测试场景
- **目录结构**: breadth=5, depth=3, 总计 155 个目录，1550 个文件
- **测试方法**: 递归 `readdir` 遍历

### 性能对比

| 实现方式 | 耗时 | 相对 Node.js |
|----------|------|-------------|
| Node.js fs | 4.75 ms | 1.0x |
| Rush-FS (递归调用 ❌) | 5.50 ms | -0.86x |
| Rush-FS (recursive: true ✅) | 1.93 ms | **2.46x** |

**关键发现**:
1. Rush-FS 的 `recursive: true` 模式性能优异（2.46x 提升）
2. 但如果用户在 JS 层递归调用（多次 NAPI 桥接），性能反而下降
3. **根本原因**: 小规模目录树强制并行，线程池开销 > 收益

---

## 🐛 当前实现问题

### 代码位置
`src/readdir.rs` Lines 93-100:

```rust
let walk_dir = WalkDir::new(path)
    .skip_hidden(skip_hidden)
    .parallelism(match opts.concurrency {
        Some(n) => Parallelism::RayonNewPool(n as usize),
        None => Parallelism::RayonNewPool(0),  // ❌ 问题：总是创建新线程池
    });
```

### 问题分析

1. **`Parallelism::RayonNewPool(0)`** = 自动选择线程数（CPU 核心数）
2. **小目录树**（如 155 个目录）：
   - 线程池初始化开销：~50-100 µs
   - 任务调度开销：每线程 ~10 µs
   - 并行收益：不足以抵消开销
3. **没有智能降级策略**

---

## 💡 优化建议

### 方案 A: 基于目录规模的智能降级

```rust
// 伪代码：根据预估规模选择策略
fn ls(path_str: String, options: Option<ReaddirOptions>) -> Result<...> {
    // ... 前置检查 ...

    if !recursive {
        // 非递归：保持现有 std::fs::read_dir (串行)
        let entries = fs::read_dir(path)...
        return Ok(...);
    }

    // 递归模式：智能选择策略
    let walk_dir = WalkDir::new(path)
        .skip_hidden(skip_hidden)
        .parallelism({
            // 新增：智能降级逻辑
            let estimated_entries = quick_count_entries(path)?;
            if estimated_entries < 1000 {
                // 小规模：用串行，避免线程池开销
                Parallelism::Serial
            } else {
                // 大规模：用并行，发挥 Rust 优势
                match opts.concurrency {
                    Some(n) => Parallelism::RayonNewPool(n as usize),
                    None => Parallelism::RayonNewPool(0),
                }
            }
        });

    // ... 后续处理 ...
}

// 快速估算目录规模（可选）
fn quick_count_entries(path: &Path) -> Result<usize> {
    // 简单实现：只统计第一层
    let count = fs::read_dir(path)?
        .take(1001)  // 最多取 1001 个
        .count();
    Ok(count)
}
```

### 方案 B: 基于深度的智能降级

```rust
// 更简单的方案：根据目录深度决定
let depth = calculate_depth(path)?;
let parallelism = if depth < 2 || estimated_entries < 1000 {
    Parallelism::Serial  // 浅层/小规模用串行
} else {
    Parallelism::RayonNewPool(0)  // 深层/大规模用并行
};
```

### 方案 C: 添加阈值配置

```rust
#[napi(object)]
pub struct ReaddirOptions {
    // ... 现有字段 ...
    
    /// 启用智能降级（默认 true）
    pub smart_degradation: Option<bool>,
    
    /// 并行阈值（默认 1000）
    pub parallel_threshold: Option<u32>,
}
```

---

## 📈 预期收益

### 小规模场景（< 1000 文件）
| 当前 | 优化后 | 提升 |
|------|--------|------|
| 5.50 ms (比 Node.js 慢) | ~4.0 ms (比 Node.js 快) | **~1.2x** |

### 大规模场景（> 1000 文件）
| 当前 | 优化后 | 变化 |
|------|--------|------|
| 1.93 ms | ~1.9 ms | 基本不变 |

### 用户体验
- ✅ 小项目不再"负优化"
- ✅ 大项目保持高性能
- ✅ 无需用户手动选择模式

---

## 🔬 测试建议

### 添加多规模 benchmark

```rust
#[cfg(test)]
mod bench {
    #[bench]
    fn bench_readdir_small(b: &mut Bencher) {
        // 100 文件，10 目录
    }

    #[bench]
    fn bench_readdir_medium(b: &mut Bencher) {
        // 1000 文件，100 目录
    }

    #[bench]
    fn bench_readdir_large(b: &mut Bencher) {
        // 30000 文件，3000 目录
    }
}
```

### 测试用例
```bash
# 小规模（应自动降级为串行）
node -e "await rushFs.readdir('./small', { recursive: true })"

# 大规模（应使用并行）
node -e "await rushFs.readdir('./large', { recursive: true })"
```

---

## 📝 实现注意事项

### 1. 性能开销
- `quick_count_entries` 本身有开销
- 建议：只统计第一层，或跳过此步骤直接用深度判断

### 2. 向后兼容
- 默认启用智能降级
- 添加 `smart_degradation: false` 选项以禁用

### 3. 文档说明
- README 添加"智能降级"说明
- 解释何时用 `recursive: true` vs 手动递归

---

## 🎯 推荐方案

**推荐方案 B（基于深度）**，理由：
1. ✅ 实现简单，无需额外统计
2. ✅ 性能开销最小
3. ✅ 覆盖大部分场景

**伪代码**:
```rust
use std::path::Component;

fn calculate_depth(path: &Path) -> usize {
    path.components()
        .filter(|c| matches!(c, Component::Normal(_)))
        .count()
}

// 在 readdir 中
let depth = calculate_depth(path);
let parallelism = if depth <= 2 {
    Parallelism::Serial  // 浅层目录用串行
} else {
    Parallelism::RayonNewPool(0)  // 深层目录用并行
};
```

---

## 🔗 参考资源

- jwalk 文档：https://docs.rs/jwalk/0.8.1/jwalk/struct.WalkDir.html
- Rayon 并行策略：https://docs.rs/rayon/1.11.0/rayon/
- Node.js fs 实现：https://github.com/nodejs/node/blob/main/lib/fs.js

---

## 📌 总结

**问题**: Rush-FS 在小规模递归 `readdir` 场景强制并行，导致性能不如 Node.js

**根因**: 缺少智能降级策略，线程池开销 > 并行收益

**建议**: 添加基于目录规模/深度的智能降级，小规模用串行，大规模用并行

**预期收益**: 
- 小规模场景从"负优化"转为正收益
- 大规模场景保持现有优势
- 用户体验提升，无需手动选择模式

---

*由 LiteWiki 项目 Rush-FS 集成测试发现*  
*2026-03-17*
