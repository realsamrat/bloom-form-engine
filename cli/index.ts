#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./commands/init";
import { connectCommand } from "./commands/connect";
import { addCommand } from "./commands/add";
import { importCommand } from "./commands/import";
import { peersCommand } from "./commands/peers";
import { setupCommand } from "./commands/setup";

const program = new Command();

program
  .name("bloom-form-engine")
  .description("CLI for BloomForm Engine - themeable, config-driven multi-step forms for Bloom.io")
  .version("0.2.5");

program
  .command("init")
  .description("Initialize BloomForm Engine in your project")
  .action(initCommand);

program
  .command("setup")
  .description("Detect or create a React framework and prepare BloomForm Engine wiring")
  .option("--framework <framework>", "Framework to create when none is detected: next, vite, or none")
  .option("-y, --yes", "Use recommended defaults without prompts")
  .option("--skip-install", "Do not install missing packages")
  .action(setupCommand);

program
  .command("connect")
  .description("Connect a Bloom.io account")
  .action(connectCommand);

program
  .command("add")
  .description("Add a new form configuration")
  .action(addCommand);

program
  .command("import")
  .description("Import a Bloom form from a public Bloom URL or API URL")
  .argument("<url>", "Bloom form URL")
  .option("-n, --name <name>", "React component name")
  .option("-o, --output <dir>", "Output directory")
  .option("--account <accountId>", "Bloom account ID override")
  .option("--form <formId>", "Bloom form/questionnaire ID override")
  .option("--proxy <url>", "Proxy/API base URL for Bloom submissions")
  .option("--page-output <dir>", "Next.js app route directory for the centered starter page")
  .option("--no-page", "Skip creating the centered starter page route")
  .option("--summary", "Add a final review/summary step")
  .option("-y, --yes", "Write the generated component without confirmation")
  .action(importCommand);

program
  .command("peers")
  .description("Check and optionally install BloomForm Engine peer dependencies")
  .action(peersCommand);

program.parse();
