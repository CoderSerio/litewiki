#!/usr/bin/env node
import { cac } from "cac";
import * as p from "@clack/prompts";
import { execa } from "execa";
import { checkIsRepo } from "./utils/git.js";
import { runDeepWikiAgent } from "./agent/provider.js";
import "dotenv/config";

const cli = cac("litewiki");

// cli.command("init", "Initialize DeepWiki in current repo").action(async () => {
//   p.intro("🚀 Personal DeepWiki MVP");

//   // 简单的交互示例
//   const confirm = await p.confirm({
//     message: "Do you want to analyze the current git diff?",
//   });

//   if (confirm) {
//     const s = p.spinner();
//     s.start("Reading git log...");
//     const { stdout } = await execa("git", ["log", "-1", "--pretty=%B"]);
//     s.stop(`Latest commit message: ${stdout}`);
//   }

//   p.outro("Done!");
// });

cli
  .command("show", "🌟 analyze the current git repository")
  .action(async () => {
    // TODO: Actually, using git itself's command to check is enough
    const isRepo = await checkIsRepo({ cwd: process.cwd() });
    if (!isRepo) {
      p.outro("Not a git repository");
      return;
    }

    const { stdout } = await execa("git", ["log", "-1", "--pretty=%B"]);
    p.outro(`Latest commit message: ${stdout}`);

    const result = await runDeepWikiAgent(process.cwd());
    p.outro(result);
  });

// cli.command("version", "Show the version of LiteWiki").action(async () => {
//   p.outro(`LiteWiki v${packageJson.version}`);
// });

cli.help();

cli.parse();
// if (parsed.args.length === 0) {
//   cli.help();
// }
