import * as fs from "fs";
import * as path from "path";
import { fileExists, readFile, resolveFromRoot, writeFile } from "./fs";

export type FrameworkId = "next-app" | "next-pages" | "vite-react" | "remix" | "astro" | "react" | "unknown" | "none";

export interface FrameworkDetection {
  id: FrameworkId;
  name: string;
  packageJsonPath: string | null;
  globalCssPath: string | null;
  hasTailwindV4: boolean;
  hasBloomSource: boolean;
}

const CSS_CANDIDATES = [
  "app/globals.css",
  "src/app/globals.css",
  "pages/_app.tsx",
  "src/pages/_app.tsx",
  "src/index.css",
  "src/App.css",
  "app/root.tsx",
  "src/root.tsx",
];

export function detectFramework(): FrameworkDetection {
  const packageJsonPath = resolveFromRoot("package.json");
  const packageJson = readPackageJson(packageJsonPath);
  const dependencies = {
    ...(packageJson?.dependencies || {}),
    ...(packageJson?.devDependencies || {}),
  };

  let id: FrameworkId = "none";
  let name = "No framework detected";

  if (dependencies.next || fileExists(resolveFromRoot("next.config.js")) || fileExists(resolveFromRoot("next.config.mjs"))) {
    if (fileExists(resolveFromRoot("app")) || fileExists(resolveFromRoot("src/app"))) {
      id = "next-app";
      name = "Next.js App Router";
    } else {
      id = "next-pages";
      name = "Next.js Pages Router";
    }
  } else if (dependencies["@remix-run/react"] || fileExists(resolveFromRoot("app/root.tsx"))) {
    id = "remix";
    name = "Remix";
  } else if (dependencies.astro || fileExists(resolveFromRoot("astro.config.mjs"))) {
    id = "astro";
    name = "Astro";
  } else if (dependencies.vite || fileExists(resolveFromRoot("vite.config.ts")) || fileExists(resolveFromRoot("vite.config.js"))) {
    id = "vite-react";
    name = "Vite React";
  } else if (dependencies.react || dependencies["react-dom"]) {
    id = "react";
    name = "React";
  } else if (packageJson) {
    id = "unknown";
    name = "Unknown JavaScript project";
  }

  const globalCssPath = findGlobalCssPath();
  const cssContent = globalCssPath ? readFile(globalCssPath) || "" : "";

  return {
    id,
    name,
    packageJsonPath: packageJson ? packageJsonPath : null,
    globalCssPath,
    hasTailwindV4: cssContent.includes('@import "tailwindcss"') || cssContent.includes("@import 'tailwindcss'"),
    hasBloomSource: cssContent.includes("bloom-form-engine/dist"),
  };
}

export function ensureTailwindV4PackageSource(): string | null {
  const candidates = ["app/globals.css", "src/app/globals.css", "src/index.css", "src/App.css"];

  for (const candidate of candidates) {
    const cssPath = resolveFromRoot(candidate);
    if (!fileExists(cssPath)) continue;

    const content = readFile(cssPath) || "";
    if (content.includes("bloom-form-engine/dist")) return null;
    if (!content.includes('@import "tailwindcss"') && !content.includes("@import 'tailwindcss'")) continue;

    const cssDir = path.dirname(cssPath);
    let sourcePath = path.relative(cssDir, resolveFromRoot("node_modules/bloom-form-engine/dist")).split(path.sep).join("/");
    if (!sourcePath.startsWith(".")) {
      sourcePath = `./${sourcePath}`;
    }

    const sourceDirective = `@source "${sourcePath}/**/*.js";`;
    const updated = content.replace(/(@import\s+["']tailwindcss["'];?)/, `$1\n${sourceDirective}`);
    writeFile(cssPath, updated);
    return `./${candidate}`;
  }

  return null;
}

export function findGlobalCssPath(): string | null {
  for (const candidate of CSS_CANDIDATES) {
    const cssPath = resolveFromRoot(candidate);
    if (fileExists(cssPath)) return cssPath;
  }

  return null;
}

export function isDirectoryEmptyForScaffold(): boolean {
  const allowed = new Set([".DS_Store", ".git", ".gitignore"]);
  return fs.readdirSync(resolveFromRoot(".")).every((entry) => allowed.has(entry));
}

export function readPackageJson(packageJsonPath = resolveFromRoot("package.json")): any | null {
  try {
    return JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  } catch {
    return null;
  }
}

export function hasDependency(packageName: string): boolean {
  const packageJson = readPackageJson();
  return Boolean(
    packageJson?.dependencies?.[packageName] ||
      packageJson?.devDependencies?.[packageName] ||
      packageJson?.peerDependencies?.[packageName]
  );
}
