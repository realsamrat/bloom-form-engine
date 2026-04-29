import chalk from "chalk";
import { askText, askNumber, askSelect, askConfirm } from "../utils/prompts";
import { writeFile, readFile, resolveFromRoot, fileExists } from "../utils/fs";
import { generateFormComponent, generatePageRoute, toKebabCase, type StepConfig } from "../utils/form-generator";
import * as path from "path";

export async function addCommand(): Promise<void> {
  console.log("");
  console.log(chalk.bold("  Add a New Form"));
  console.log("");

  const configPath = resolveFromRoot("bloom-form.config.ts");
  if (!fileExists(configPath)) {
    console.log(chalk.red("  bloom-form.config.ts not found. Run 'bloom-form-engine init' first."));
    return;
  }

  // Read config to get accounts and output dir
  const configContent = readFile(configPath);
  const outputDirMatch = configContent?.match(/outputDir:\s*['"]([^'"]+)['"]/);
  const outputDir = outputDirMatch?.[1] || "./components/forms";

  // Extract account IDs from config
  const accountMatches = [...(configContent?.matchAll(/(\w+):\s*\{\s*accountId:\s*['"]([^'"]+)['"]/g) || [])];
  const accounts = accountMatches.map(m => ({ name: m[1], id: m[2] }));

  // Form name
  const formName = await askText("Form name (e.g., RentalQuote):");
  const componentName = formName.charAt(0).toUpperCase() + formName.slice(1);
  const fileName = `${componentName}Form`;

  // Account selection
  let accountId: string;
  if (accounts.length === 0) {
    console.log(chalk.yellow("  No accounts found. Enter account ID manually:"));
    accountId = await askText("Bloom Account ID:");
  } else if (accounts.length === 1) {
    accountId = accounts[0].id;
    console.log(chalk.gray(`  Using account: ${accounts[0].name} (${accountId})`));
  } else {
    const selectedAccount = await askSelect(
      "Which Bloom account?",
      accounts.map(a => ({ title: `${a.name} (${a.id})`, value: a.id }))
    );
    accountId = selectedAccount;
  }

  // Form/Questionnaire ID
  const formId = await askText("Questionnaire/Form ID:");

  // Steps
  const stepCount = await askNumber("How many steps?", 5);
  const steps: StepConfig[] = [];

  for (let i = 0; i < stepCount; i++) {
    console.log("");
    console.log(chalk.bold(`  Step ${i + 1} of ${stepCount}`));

    const stepId = await askText("Step ID:");
    const questionId = await askText("Question ID (leave empty for summary):", "");

    const stepType = await askSelect("Step type:", [
      { title: "Multiple Choice", value: "multiple_choice" },
      { title: "Date Picker", value: "date" },
      { title: "Address / Location", value: "address" },
      { title: "Personal Info (name, email, phone)", value: "personal_info" },
      { title: "Text Input", value: "text" },
      { title: "Text Area", value: "textarea" },
      { title: "Summary / Review", value: "summary" },
    ]);

    const title = await askText("Step title:");
    const description = await askText("Step description:");

    const step: StepConfig = {
      id: stepId,
      questionId,
      title,
      description,
      type: stepType,
    };

    // Type-specific options
    if (stepType === "multiple_choice") {
      const singleSelect = await askConfirm("Single select (radio)?", true);
      step.singleSelect = singleSelect;

      const optionsStr = await askText("Options (comma-separated):");
      step.options = optionsStr.split(",").map(opt => {
        const trimmed = opt.trim();
        return { value: trimmed, label: trimmed };
      });
    }

    if (stepType === "personal_info") {
      const useDefaultFields = await askConfirm("Use default fields (First Name, Last Name, Email, Phone)?", true);
      if (useDefaultFields) {
        step.fields = [
          { name: "firstName", label: "First Name", type: "text", required: true },
          { name: "lastName", label: "Last Name", type: "text", required: true },
          { name: "email", label: "Email Address", type: "email", required: true },
          { name: "phone", label: "Phone Number", type: "tel", required: true },
        ];
      }
    }

    if (stepType !== "summary") {
      step.required = await askConfirm("Required?", true);
    }

    steps.push(step);
  }

  // Success message
  console.log("");
  console.log(chalk.bold("  Success Message"));
  const successTitle = await askText("Success message title:", "All Done!");
  const successDescription = await askText(
    "Success message description:",
    "Thank you for taking a moment to answer these questions. You can expect to hear back from us within 24 hours."
  );

  console.log("");
  console.log(chalk.bold("  Bloom Submission Proxy"));
  console.log(chalk.yellow("  Bloom can reject submissions from localhost."));
  console.log(chalk.gray("  Enter your deployed proxy/API domain now, or leave blank to set it up later."));
  const proxyBaseUrlInput = await askText("Proxy base URL (optional):", "");
  const proxyBaseUrl = proxyBaseUrlInput.trim() || undefined;

  // Generate the form component
  const componentContent = generateFormComponent(
    fileName,
    accountId,
    formId,
    steps,
    successTitle,
    successDescription,
    { proxyBaseUrl }
  );

  const outputPath = resolveFromRoot(path.join(outputDir, `${fileName}.tsx`));
  writeFile(outputPath, componentContent);

  const createPage = await askConfirm("Create a centered Next.js page route for this form?", true);
  let pageOutputDir: string | null = null;

  if (createPage) {
    pageOutputDir = await askText(
      "Page route directory:",
      `./app/${toKebabCase(formName, "bloom-form")}`
    );
    const pagePath = resolveFromRoot(path.join(pageOutputDir, "page.tsx"));
    const componentImportPath = toImportPath(path.relative(path.dirname(pagePath), outputPath).replace(/\.tsx$/, ""));
    writeFile(pagePath, generatePageRoute(fileName, componentImportPath));
  }

  console.log("");
  console.log(chalk.green(`  ✓ Created ${outputDir}/${fileName}.tsx`));
  if (pageOutputDir) {
    console.log(chalk.green(`  ✓ Created ${pageOutputDir}/page.tsx`));
  }
  console.log("");
  console.log(chalk.bold("  Usage:"));
  console.log(chalk.gray(`    import ${fileName} from '${outputDir}/${fileName}';`));
  console.log(chalk.gray(`    <${fileName} />`));
  if (pageOutputDir) {
    console.log(chalk.gray(`    Visit the generated route at ${pageOutputDir.replace(/^\.\/app\/?/, "/") || "/"}`));
  }
  console.log("");
}

function toImportPath(relativePath: string): string {
  const normalized = relativePath.split(path.sep).join("/");
  return normalized.startsWith(".") ? normalized : `./${normalized}`;
}
