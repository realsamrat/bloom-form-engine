import chalk from "chalk";
import { askText } from "../utils/prompts";
import { readFile, writeFile, resolveFromRoot, fileExists } from "../utils/fs";

export async function connectCommand(): Promise<void> {
  console.log("");
  console.log(chalk.bold("  Connect a Bloom.io Account"));
  console.log("");

  const configPath = resolveFromRoot("bloom-form.config.ts");
  if (!fileExists(configPath)) {
    console.log(chalk.red("  bloom-form.config.ts not found. Run 'bloom-form-engine init' first."));
    return;
  }

  const accountId = await askText("Your Bloom Account ID:");
  if (!accountId.trim()) {
    console.log(chalk.red("  Account ID is required."));
    return;
  }

  const accountName = await askText("Account name (for reference):", "default");
  const accountKey = accountName.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Read and update config file
  const configContent = readFile(configPath);
  if (!configContent) {
    console.log(chalk.red("  Could not read bloom-form.config.ts"));
    return;
  }

  // Check if accounts object exists and add the new account
  let updatedContent: string;

  if (configContent.includes("accounts: {}")) {
    // Replace empty accounts with new account
    updatedContent = configContent.replace(
      "accounts: {},",
      `accounts: {\n    ${accountKey}: {\n      accountId: '${accountId}',\n    },\n  },`
    );
  } else if (configContent.includes("accounts: {")) {
    // Add to existing accounts
    updatedContent = configContent.replace(
      "accounts: {",
      `accounts: {\n    ${accountKey}: {\n      accountId: '${accountId}',\n    },`
    );
  } else {
    console.log(chalk.yellow("  Could not find accounts section in config. Please add manually:"));
    console.log(chalk.gray(`    ${accountKey}: { accountId: '${accountId}' }`));
    return;
  }

  writeFile(configPath, updatedContent);

  console.log("");
  console.log(chalk.green(`  ✓ Account '${accountName}' connected (ID: ${accountId})`));
  console.log(chalk.gray("    Saved to bloom-form.config.ts"));
  console.log("");
  console.log(chalk.bold("  Next step:"));
  console.log(chalk.gray("  Run 'bloom-form-engine add' to create a form for this account"));
  console.log("");
}
