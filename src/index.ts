#!/usr/bin/env node
import { cac } from "cac";
import * as p from "@clack/prompts";
import { execa } from "execa";

const cli = cac("litewiki");

cli.command("init", "Initialize DeepWiki in current repo").action(async () => {
  p.intro("🚀 Personal DeepWiki MVP");

  // 简单的交互示例
  const confirm = await p.confirm({
    message: "Do you want to analyze the current git diff?",
  });

  if (confirm) {
    const s = p.spinner();
    s.start("Reading git log...");
    const { stdout } = await execa("git", ["log", "-1", "--pretty=%B"]);
    s.stop(`Latest commit message: ${stdout}`);
  }

  p.outro("Done!");
});

cli.help();
cli.parse();
