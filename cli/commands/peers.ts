import path from "path";
import { spawnSync } from "child_process";

export function peersCommand(): void {
  const scriptPath = path.resolve(__dirname, "../../../scripts/check-peer-deps.cjs");
  const result = spawnSync(process.execPath, [scriptPath, "--manual"], {
    cwd: process.env.INIT_CWD || process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
}
