#!/usr/bin/env node
import "dotenv/config";
import { cliMain } from "./cli/main.js";

cliMain(process.argv).catch((err) => {
  // CLI：显式失败，不要默默吞错
  console.error(err);
  process.exitCode = 1;
});
