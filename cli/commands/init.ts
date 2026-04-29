import chalk from "chalk";
import { askText, askSelect } from "../utils/prompts";
import { writeFile, resolveFromRoot, fileExists } from "../utils/fs";

export async function initCommand(): Promise<void> {
  console.log("");
  console.log(chalk.bold("  Welcome to BloomForm Engine"));
  console.log(chalk.gray("  Themeable, config-driven multi-step forms for Bloom.io"));
  console.log("");

  // Check if already initialized
  const configPath = resolveFromRoot("bloom-form.config.ts");
  if (fileExists(configPath)) {
    console.log(chalk.yellow("  bloom-form.config.ts already exists. Skipping init."));
    console.log(chalk.gray("  Run 'bloom-form-engine connect' to add an account."));
    console.log(chalk.gray("  Run 'bloom-form-engine add' to create a new form."));
    return;
  }

  // Ask questions
  const outputDir = await askText("Where should we put form components?", "./components/forms");
  const placesEndpoint = await askText("Google Places API endpoint?", "/api/google/places/autocomplete");
  const theme = await askSelect("Choose a theme preset:", [
    { title: "Default (neutral grays, system fonts)", value: "default" },
    { title: "Dark", value: "dark" },
    { title: "Custom (I'll set CSS variables myself)", value: "custom" },
  ]);

  // Generate config file
  const configContent = `import type { BloomEngineConfig } from 'bloom-form-engine';

const config: BloomEngineConfig = {
  outputDir: '${outputDir}',
  placesEndpoint: '${placesEndpoint}',
  theme: '${theme}',
  accounts: {},
};

export default config;
`;

  writeFile(configPath, configContent);
  console.log("");
  console.log(chalk.green("  ✓ Created bloom-form.config.ts"));

  // Generate theme CSS if not custom
  if (theme !== "custom") {
    const themeCss = generateThemeCss(theme);
    const themePath = resolveFromRoot("bloom-form-theme.css");
    writeFile(themePath, themeCss);
    console.log(chalk.green("  ✓ Created bloom-form-theme.css"));
    console.log(chalk.gray(`    Import this in your global CSS or layout file.`));
  }

  console.log("");
  console.log(chalk.bold("  Next steps:"));
  console.log(chalk.gray("  1. Run 'bloom-form-engine connect' to link your Bloom.io account"));
  console.log(chalk.gray("  2. Run 'bloom-form-engine add' to create your first form"));
  console.log("");
}

function generateThemeCss(theme: string): string {
  if (theme === "dark") {
    return `/* BloomForm Engine - Dark Theme */
:root {
  --bf-font-heading: system-ui, -apple-system, sans-serif;
  --bf-font-body: system-ui, -apple-system, sans-serif;
  --bf-color-accent: #cee542;
  --bf-color-accent-hover: #d4ea5a;
  --bf-color-accent-bg: rgba(206, 229, 66, 0.15);
  --bf-color-error: #ef4444;
  --bf-color-success-bg: #cee542;
  --bf-color-success-text: #0c3406;
  --bf-color-border: #333333;
  --bf-color-border-idle: #2a2a2a;
  --bf-color-bg: #1a1a1a;
  --bf-color-bg-header: #111111;
  --bf-color-text: #f5f5f5;
  --bf-color-text-primary: #ffffff;
  --bf-color-text-muted: #999999;
  --bf-color-text-subtle: #666666;
  --bf-color-text-disabled: #444444;
  --bf-color-text-calendar: #cccccc;
  --bf-radius: 10px;
  --bf-radius-card: 12px;
}
`;
  }

  // Default theme
  return `/* BloomForm Engine - Default Theme */
@import 'bloom-form-engine/src/theme.css';

/* Override variables here to customize:
:root {
  --bf-font-heading: 'Your Heading Font', sans-serif;
  --bf-font-body: 'Your Body Font', sans-serif;
  --bf-color-accent: #your-accent-color;
}
*/
`;
}
