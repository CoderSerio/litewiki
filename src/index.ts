#!/usr/bin/env node
import "dotenv/config";
import { cliMain } from "./cli/main.js";

await cliMain(process.argv);
