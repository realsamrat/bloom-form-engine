#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { createRequire } = require("module");

const PEERS = [
  { name: "react", range: ">=18.0.0", minMajor: 18 },
  { name: "react-dom", range: ">=18.0.0", minMajor: 18 },
  { name: "framer-motion", range: ">=10.0.0", minMajor: 10 },
];

const isManual = process.argv.includes("--manual");
const projectRoot = process.env.INIT_CWD || process.cwd();
const packageRoot = path.resolve(__dirname, "..");

const FRAMEWORK_FILES = [
  "app/globals.css",
  "src/app/globals.css",
  "src/index.css",
  "src/App.css",
  "pages/_app.tsx",
  "src/pages/_app.tsx",
  "app/root.tsx",
  "src/root.tsx",
];

function shouldSkip() {
  return (
    process.env.BLOOM_FORM_ENGINE_SKIP_INSTALLER === "1" ||
    process.env.BLOOM_FORM_ENGINE_SKIP_PEER_CHECK === "1" ||
    process.env.CI === "true" ||
    process.env.npm_config_ignore_scripts === "true"
  );
}

function isGlobalInstall() {
  return process.env.npm_config_global === "true" || process.env.npm_config_location === "global";
}

function readInstalledVersion(packageName) {
  try {
    const projectRequire = createRequire(path.join(projectRoot, "package.json"));
    const packageJsonPath = projectRequire.resolve(`${packageName}/package.json`);
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    return packageJson.version || null;
  } catch {
    return null;
  }
}

function majorOf(version) {
  const match = String(version || "").match(/^(\d+)/);
  return match ? Number(match[1]) : 0;
}

function getMissingPeers() {
  return PEERS.filter((peer) => {
    const version = readInstalledVersion(peer.name);
    return !version || majorOf(version) < peer.minMajor;
  });
}

function getPackageManager() {
  const userAgent = process.env.npm_config_user_agent || "";

  if (userAgent.startsWith("pnpm/")) return { command: "pnpm", args: ["add"] };
  if (userAgent.startsWith("yarn/")) return { command: "yarn", args: ["add"] };
  if (userAgent.startsWith("bun/")) return { command: "bun", args: ["add"] };

  return { command: "npm", args: ["install"] };
}

function packageSpec(peer) {
  return `${peer.name}@${peer.range}`;
}

function formatForDisplay(value) {
  return /[<>=]/.test(value) ? `"${value}"` : value;
}

function installPeers(peers) {
  const manager = getPackageManager();
  const packages = peers.map(packageSpec);
  const commandForDisplay = [manager.command, ...manager.args, ...packages.map(formatForDisplay)].join(" ");

  console.log(`\nInstalling peer dependencies with:\n${commandForDisplay}\n`);

  const result = spawnSync(manager.command, [...manager.args, ...packages], {
    cwd: projectRoot,
    env: {
      ...process.env,
      BLOOM_FORM_ENGINE_SKIP_PEER_CHECK: "1",
      BLOOM_FORM_ENGINE_SKIP_INSTALLER: "1",
    },
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.error) {
    console.warn(`\nCould not run ${manager.command}. Please run this manually:\n${commandForDisplay}`);
    return 1;
  }

  return result.status || 0;
}

function readProjectPackageJson() {
  try {
    return JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
  } catch {
    return null;
  }
}

function detectFramework() {
  const packageJson = readProjectPackageJson();
  const dependencies = {
    ...(packageJson?.dependencies || {}),
    ...(packageJson?.devDependencies || {}),
  };

  if (dependencies.next || fs.existsSync(path.join(projectRoot, "next.config.js")) || fs.existsSync(path.join(projectRoot, "next.config.mjs"))) {
    return fs.existsSync(path.join(projectRoot, "app")) || fs.existsSync(path.join(projectRoot, "src/app"))
      ? "Next.js App Router"
      : "Next.js Pages Router";
  }

  if (dependencies.vite || fs.existsSync(path.join(projectRoot, "vite.config.ts")) || fs.existsSync(path.join(projectRoot, "vite.config.js"))) {
    return "Vite React";
  }

  if (dependencies["@remix-run/react"] || fs.existsSync(path.join(projectRoot, "app/root.tsx"))) {
    return "Remix";
  }

  if (dependencies.astro || fs.existsSync(path.join(projectRoot, "astro.config.mjs"))) {
    return "Astro";
  }

  if (dependencies.react || dependencies["react-dom"]) {
    return "React";
  }

  return packageJson ? "Unknown JavaScript project" : null;
}

function findGlobalCss() {
  return FRAMEWORK_FILES.map((candidate) => path.join(projectRoot, candidate)).find((candidate) => fs.existsSync(candidate)) || null;
}

async function maybePromptForFrameworkSetup() {
  const canPrompt = process.stdin.isTTY && process.stdout.isTTY;
  const framework = detectFramework();
  const globalCss = findGlobalCss();
  const cssContent = globalCss ? fs.readFileSync(globalCss, "utf8") : "";
  const needsCssSetup =
    !globalCss ||
    (cssContent.includes("tailwindcss") && !cssContent.includes("bloom-form-engine/dist")) ||
    (!cssContent.includes("bloom-form-theme.css") && !cssContent.includes("bloom-form-engine/src/theme.css"));

  if (!framework) {
    console.log(
      "\nBloomForm Engine did not detect a React framework in this folder.\n" +
        "Run this one-command setup to create an app, install dependencies, and wire the theme:\n" +
        "npx bloom-form-engine setup\n"
    );

    if (!canPrompt) return;
    const prompts = require("prompts");
    const response = await prompts({
      type: "confirm",
      name: "run",
      message: "Run BloomForm Engine setup now?",
      initial: true,
    });
    if (response.run) runSetupCommand();
    return;
  }

  console.log(`\nBloomForm Engine detected ${framework}.`);

  if (!needsCssSetup) {
    console.log("Theme/CSS wiring already looks ready.");
    return;
  }

  console.log(
    "Run this to install missing pieces and wire the theme/CSS for this project:\n" +
      "npx bloom-form-engine setup\n"
  );

  if (!canPrompt) return;
  const prompts = require("prompts");
  const response = await prompts({
    type: "confirm",
    name: "run",
    message: "Run BloomForm Engine setup now?",
    initial: true,
  });
  if (response.run) runSetupCommand();
}

function runSetupCommand() {
  const cliPath = path.join(packageRoot, "dist", "cli", "index.js");
  const result = spawnSync(process.execPath, [cliPath, "setup"], {
    cwd: projectRoot,
    env: { ...process.env, BLOOM_FORM_ENGINE_SKIP_INSTALLER: "1" },
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.error || result.status !== 0) {
    console.warn("\nBloomForm Engine setup could not run automatically. Try:\nnpx bloom-form-engine setup\n");
  }
}

async function promptForPeers(peers) {
  const prompts = require("prompts");
  const choices = [
    { title: "All required dependencies", value: "__all__", selected: true },
    ...peers.map((peer) => ({
      title: `${peer.name}@${peer.range}`,
      value: peer.name,
      selected: true,
    })),
  ];

  const response = await prompts({
    type: "multiselect",
    name: "selected",
    message: "BloomForm Engine needs peer dependencies. What should be installed?",
    choices,
    min: 1,
    hint: "- Space to select. Return to continue.",
  });

  if (!response.selected || response.selected.length === 0) {
    console.log("\nSkipping peer dependency installation.");
    return [];
  }

  if (response.selected.includes("__all__")) {
    return peers;
  }

  const selected = new Set(response.selected);
  return peers.filter((peer) => selected.has(peer.name));
}

async function main() {
  if (!isManual && isGlobalInstall()) {
    console.log("BloomForm Engine installed globally. Skipping local framework detection.");
    return;
  }

  if (!isManual && shouldSkip()) {
    return;
  }

  const missingPeers = getMissingPeers();

  if (missingPeers.length === 0) {
    if (isManual) {
      console.log("BloomForm Engine peer dependencies are already installed.");
    }
    if (!isManual) {
      await maybePromptForFrameworkSetup();
    }
    return;
  }

  const installCommand = [
    getPackageManager().command,
    ...getPackageManager().args,
    ...missingPeers.map(packageSpec).map(formatForDisplay),
  ].join(" ");

  const canPrompt = process.stdin.isTTY && process.stdout.isTTY;

  if (!canPrompt) {
    console.log(
      `\nBloomForm Engine needs these peer dependencies: ${missingPeers
        .map((peer) => `${peer.name}@${peer.range}`)
        .join(", ")}.\nRun this in your project when installation finishes:\n${installCommand}\n`
    );
    if (!isManual) {
      await maybePromptForFrameworkSetup();
    }
    return;
  }

  const selectedPeers = await promptForPeers(missingPeers);

  if (selectedPeers.length === 0) {
    console.log(`You can install them later with:\n${installCommand}`);
    if (!isManual) {
      await maybePromptForFrameworkSetup();
    }
    return;
  }

  const status = installPeers(selectedPeers);
  if (status === 0 && !isManual) {
    await maybePromptForFrameworkSetup();
  }
  process.exit(status);
}

main().catch((error) => {
  console.warn(`BloomForm Engine peer dependency check skipped: ${error.message}`);
});
