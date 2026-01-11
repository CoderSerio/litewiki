#!/usr/bin/env node
import "dotenv/config";
import { cliMain } from "./cli/index.js";

cliMain(process.argv).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
