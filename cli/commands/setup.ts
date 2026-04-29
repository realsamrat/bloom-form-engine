import * as path from "path";
import { spawnSync } from "child_process";
import chalk from "chalk";
import { askConfirm, askSelect } from "../utils/prompts";
import { fileExists, readFile, resolveFromRoot, writeFile } from "../utils/fs";
import {
  detectFramework,
  ensureTailwindV4PackageSource,
  hasDependency,
  isDirectoryEmptyForScaffold,
  type FrameworkDetection,
  type FrameworkId,
} from "../utils/framework";

interface SetupOptions {
  framework?: string;
  yes?: boolean;
  skipInstall?: boolean;
}

const REQUIRED_PACKAGES = ["bloom-form-engine", "framer-motion"];

export async function setupCommand(options: SetupOptions = {}): Promise<void> {
  console.log("");
  console.log(chalk.bold("  BloomForm Engine setup"));
  console.log(chalk.gray("  Detects your app, installs dependencies, and prepares theme/CSS wiring."));
  console.log("");

  let framework = detectFramework();

  if (framework.id === "none" || framework.id === "unknown") {
    framework = await prepareFramework(framework, options);
  } else {
    console.log(chalk.green(`  ✓ Detected ${framework.name}`));
  }

  if (!options.skipInstall) {
    ensurePackagesInstalled(framework);
  }

  ensureInitFiles();
  ensureFrameworkCss();

  console.log("");
  console.log(chalk.bold("  Ready."));
  console.log(chalk.gray("  Import a Bloom URL with:"));
  console.log(chalk.cyan('  npx bloom-form-engine import "https://your-account.bloom.io/your-form" --proxy "yourdomain.com"'));
  console.log("");
}

async function prepareFramework(framework: FrameworkDetection, options: SetupOptions): Promise<FrameworkDetection> {
  if (framework.id === "unknown") {
    console.log(chalk.yellow("  A package.json exists, but no supported React framework was detected."));
  } else {
    console.log(chalk.yellow("  No app framework was detected in this folder."));
  }

  const selectedFramework = await chooseFramework(options);

  if (selectedFramework === "none") {
    console.log(chalk.gray("  Skipping framework creation. BloomForm Engine will be installed for manual wiring."));
    return framework;
  }

  if (!isDirectoryEmptyForScaffold()) {
    const proceed = options.yes
      ? false
      : await askConfirm("This folder is not empty. Continue without creating a new framework?", true);
    if (!proceed) {
      console.log(chalk.gray("  Setup cancelled before framework creation."));
      process.exit(0);
    }
    return framework;
  }

  if (selectedFramework === "next-app") {
    runCommand("npx", [
      "create-next-app@latest",
      ".",
      "--ts",
      "--tailwind",
      "--eslint",
      "--app",
      "--use-npm",
      "--yes",
      "--no-src-dir",
      "--import-alias",
      "@/*",
    ]);
  }

  if (selectedFramework === "vite-react") {
    runCommand("npm", ["create", "vite@latest", ".", "--", "--template", "react-ts"]);
    runCommand(getPackageManager().command, ["install"]);
  }

  const nextDetection = detectFramework();
  console.log(chalk.green(`  ✓ Created ${nextDetection.name}`));
  return nextDetection;
}

async function chooseFramework(options: SetupOptions): Promise<FrameworkId> {
  const requested = normalizeFramework(options.framework);
  if (requested) return requested;
  if (options.yes) return "next-app";

  const value = await askSelect("Choose a framework to set up in this folder:", [
    { title: "Next.js App Router (recommended)", value: "next-app" },
    { title: "Vite React", value: "vite-react" },
    { title: "Do not create a framework", value: "none" },
  ]);

  return normalizeFramework(value) || "none";
}

function normalizeFramework(value: string | undefined): FrameworkId | null {
  if (!value) return null;
  if (["next", "next-app", "nextjs"].includes(value)) return "next-app";
  if (["vite", "vite-react"].includes(value)) return "vite-react";
  if (["none", "manual", "skip"].includes(value)) return "none";
  return null;
}

function ensurePackagesInstalled(framework: FrameworkDetection): void {
  const missing = REQUIRED_PACKAGES.filter((packageName) => !hasDependency(packageName));
  if (framework.id === "none" || framework.id === "unknown") {
    if (!hasDependency("react")) missing.push("react");
    if (!hasDependency("react-dom")) missing.push("react-dom");
  }

  const uniqueMissing = [...new Set(missing)];
  if (uniqueMissing.length === 0) {
    console.log(chalk.green("  ✓ BloomForm Engine dependencies are installed"));
    return;
  }

  const manager = getPackageManager();
  runCommand(manager.command, [...manager.args, ...uniqueMissing]);
}

function ensureInitFiles(): void {
  const configPath = resolveFromRoot("bloom-form.config.ts");
  if (!fileExists(configPath)) {
    const configContent = `import type { BloomEngineConfig } from 'bloom-form-engine';

const config: BloomEngineConfig = {
  outputDir: './components/forms',
  placesEndpoint: '/api/bloom/places/autocomplete',
  theme: 'default',
  accounts: {},
};

export default config;
`;
    writeFile(configPath, configContent);
    console.log(chalk.green("  ✓ Created bloom-form.config.ts"));
  } else {
    console.log(chalk.green("  ✓ bloom-form.config.ts already exists"));
  }

  const themePath = resolveFromRoot("bloom-form-theme.css");
  if (!fileExists(themePath)) {
    writeFile(
      themePath,
      `/* BloomForm Engine - Default Theme */
@import 'bloom-form-engine/src/theme.css';

/* Override variables here to customize your form:
:root {
  --bf-font-heading: 'Inter', system-ui, sans-serif;
  --bf-font-body: 'Inter', system-ui, sans-serif;
  --bf-color-accent: #cee542;
}
*/
`
    );
    console.log(chalk.green("  ✓ Created bloom-form-theme.css"));
  } else {
    console.log(chalk.green("  ✓ bloom-form-theme.css already exists"));
  }
}

function ensureFrameworkCss(): void {
  const updatedTailwindSource = ensureTailwindV4PackageSource();
  if (updatedTailwindSource) {
    console.log(chalk.green(`  ✓ Updated ${updatedTailwindSource} for Tailwind package scanning`));
  }

  const latest = detectFramework();
  if (!latest.globalCssPath) {
    console.log(chalk.yellow("  No global CSS file was found. Import bloom-form-theme.css from your app entry/layout file."));
    return;
  }

  const content = readFile(latest.globalCssPath) || "";
  if (content.includes("bloom-form-theme.css") || content.includes("bloom-form-engine/src/theme.css")) {
    console.log(chalk.green(`  ✓ Theme CSS is already wired in ${relativeFromRoot(latest.globalCssPath)}`));
    return;
  }

  if (latest.globalCssPath.endsWith(".css")) {
    const relativeThemePath = cssImportPath(latest.globalCssPath, resolveFromRoot("bloom-form-theme.css"));
    writeFile(latest.globalCssPath, `@import "${relativeThemePath}";\n${content}`);
    console.log(chalk.green(`  ✓ Added theme import to ${relativeFromRoot(latest.globalCssPath)}`));
    return;
  }

  console.log(
    chalk.yellow(
      `  Found ${relativeFromRoot(latest.globalCssPath)}. Import './bloom-form-theme.css' there or in your root layout.`
    )
  );
}

function cssImportPath(fromFile: string, toFile: string): string {
  let relativePath = path.relative(path.dirname(fromFile), toFile).split(path.sep).join("/");
  if (!relativePath.startsWith(".")) relativePath = `./${relativePath}`;
  return relativePath;
}

function relativeFromRoot(filePath: string): string {
  return `./${path.relative(resolveFromRoot("."), filePath).split(path.sep).join("/")}`;
}

function getPackageManager(): { command: string; args: string[] } {
  const userAgent = process.env.npm_config_user_agent || "";
  if (userAgent.startsWith("pnpm/")) return { command: "pnpm", args: ["add"] };
  if (userAgent.startsWith("yarn/")) return { command: "yarn", args: ["add"] };
  if (userAgent.startsWith("bun/")) return { command: "bun", args: ["add"] };
  return { command: "npm", args: ["install"] };
}

function runCommand(command: string, args: string[]): void {
  console.log("");
  console.log(chalk.gray(`  $ ${[command, ...args].join(" ")}`));

  const result = spawnSync(command, args, {
    cwd: resolveFromRoot("."),
    env: {
      ...process.env,
      BLOOM_FORM_ENGINE_SKIP_PEER_CHECK: "1",
      BLOOM_FORM_ENGINE_SKIP_INSTALLER: "1",
    },
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.error || result.status !== 0) {
    throw new Error(`Command failed: ${[command, ...args].join(" ")}`);
  }
}
