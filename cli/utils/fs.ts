import * as fs from "fs";
import * as path from "path";

export function writeFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, "utf-8");
}

export function readFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function getProjectRoot(): string {
  return process.cwd();
}

export function resolveFromRoot(...segments: string[]): string {
  return path.resolve(getProjectRoot(), ...segments);
}
