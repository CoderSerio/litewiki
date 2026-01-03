#!/usr/bin/env node
import { cac } from "cac";
import * as p from "@clack/prompts";
import { execa } from "execa";
import { checkIsRepo } from "./utils/git.js";
import { runDeepWikiAgent } from "./agent/provider.js";
import "dotenv/config";

const cli = cac("litewiki");

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

cli.help();
cli.parse();
