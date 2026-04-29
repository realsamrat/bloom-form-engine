import chalk from "chalk";
import { askConfirm, askText } from "../utils/prompts";
import { fileExists, readFile, resolveFromRoot, writeFile } from "../utils/fs";
import {
  generateBloomProxyRoute,
  generateFormComponent,
  generatePageRoute,
  toCamelCase,
  toKebabCase,
  toPascalCase,
  type StepConfig,
} from "../utils/form-generator";
import * as path from "path";

const BLOOM_BASE_URL = "https://api.bloom.io/api";

interface ImportOptions {
  name?: string;
  output?: string;
  account?: string;
  form?: string;
  proxy?: string;
  pageOutput?: string;
  noPage?: boolean;
  summary?: boolean;
  yes?: boolean;
}

interface BloomQuestion {
  id: string;
  title?: string;
  description?: unknown;
  type: string;
  options?: {
    fields?: string[];
    allowMultiSelect?: boolean;
    maxSelections?: number | null;
    [key: string]: unknown;
  } | null;
  isRequired?: boolean;
}

interface BloomQuestionnaire {
  id: string;
  title?: string;
  outroTitle?: string;
  outroText?: string;
  accountId?: string;
  settings?: {
    isSummaryEnabled?: boolean;
    [key: string]: unknown;
  };
  questions?: BloomQuestion[];
}

interface BloomPublicFormResponse {
  questionnaire?: BloomQuestionnaire;
}

interface DiscoveredIds {
  accountId?: string;
  formId?: string;
}

export async function importCommand(url: string, options: ImportOptions = {}): Promise<void> {
  console.log("");
  console.log(chalk.bold("  Import Bloom Form"));
  console.log("");

  const configContent = fileExists(resolveFromRoot("bloom-form.config.ts"))
    ? readFile(resolveFromRoot("bloom-form.config.ts"))
    : null;

  const outputDir = options.output || getOutputDir(configContent) || "./components/forms";
  const knownAccounts = getKnownAccounts(configContent);
  const discovered = await discoverIds(url);

  const formId = options.form || discovered.formId || await askText("Bloom form/questionnaire ID:");
  let accountId = options.account || discovered.accountId;

  if (!accountId && knownAccounts.length === 1) {
    accountId = knownAccounts[0].id;
    console.log(chalk.gray(`  Using configured account: ${knownAccounts[0].name} (${accountId})`));
  }

  if (!accountId) {
    accountId = await askText("Bloom account ID:");
  }

  const questionnaire = await fetchQuestionnaire(accountId, formId);
  const inferredName = toPascalCase(options.name || questionnaire.title || "ImportedBloom");
  const componentName = inferredName.endsWith("Form") ? inferredName : `${inferredName}Form`;

  const steps = questionnaireToSteps(questionnaire);
  const shouldAddSummary =
    options.summary ??
    Boolean(questionnaire.settings?.isSummaryEnabled) ??
    false;

  if (shouldAddSummary && !steps.some(step => step.type === "summary")) {
    steps.push({
      id: "summary",
      questionId: "",
      title: "Review",
      description: "Please confirm your details before submitting.",
      type: "summary",
    });
  }

  const successTitle = plainText(questionnaire.outroTitle) || "All Done!";
  const successDescription =
    plainText(questionnaire.outroText) ||
    "Thank you for taking a moment to answer these questions. You can expect to hear back soon.";

  const proxyBaseUrl = await resolveProxyBaseUrl(options.proxy, options.yes);
  const shouldCreatePage = options.noPage !== true;
  const pageOutputDir = options.pageOutput || `./app/${toKebabCase(componentName.replace(/Form$/, ""), "bloom-form")}`;
  const proxyRouteOutput = getLocalProxyRouteOutput(proxyBaseUrl);

  printImportSummary(accountId, formId, componentName, steps, proxyBaseUrl, shouldCreatePage ? pageOutputDir : null, proxyRouteOutput);

  if (!options.yes) {
    const proceed = await askConfirm("Create this form component?", true);
    if (!proceed) {
      console.log(chalk.yellow("  Import cancelled."));
      return;
    }
  }

  const componentContent = generateFormComponent(
    componentName,
    accountId,
    formId,
    steps,
    successTitle,
    successDescription,
    { proxyBaseUrl }
  );

  const outputPath = resolveFromRoot(path.join(outputDir, `${componentName}.tsx`));
  writeFile(outputPath, componentContent);

  if (shouldCreatePage) {
    const pagePath = resolveFromRoot(path.join(pageOutputDir, "page.tsx"));
    const componentImportPath = toImportPath(path.relative(path.dirname(pagePath), outputPath).replace(/\.tsx$/, ""));
    const pageContent = generatePageRoute(componentName, componentImportPath);
    writeFile(pagePath, pageContent);
  }

  if (proxyRouteOutput) {
    writeFile(resolveFromRoot(proxyRouteOutput), generateBloomProxyRoute());
  }

  console.log("");
  console.log(chalk.green(`  ✓ Created ${outputDir}/${componentName}.tsx`));
  if (shouldCreatePage) {
    console.log(chalk.green(`  ✓ Created ${pageOutputDir}/page.tsx`));
  }
  if (proxyRouteOutput) {
    console.log(chalk.green(`  ✓ Created ${proxyRouteOutput}`));
  }
  console.log("");
  console.log(chalk.bold("  Usage:"));
  console.log(chalk.gray(`    import ${componentName} from '${outputDir}/${componentName}';`));
  console.log(chalk.gray(`    <${componentName} />`));
  if (shouldCreatePage) {
    console.log(chalk.gray(`    Visit the generated route at ${pageOutputDir.replace(/^\.\/app\/?/, "/") || "/"}`));
  }
  console.log("");
}

async function resolveProxyBaseUrl(optionValue: string | undefined, skipPrompt: boolean | undefined): Promise<string | undefined> {
  if (optionValue) return optionValue;
  if (skipPrompt) return undefined;

  console.log("");
  console.log(chalk.yellow("  Bloom can reject submissions from localhost."));
  console.log(chalk.gray("  Enter your deployed proxy/API domain now, or leave blank to set it up later."));

  const value = await askText("Proxy base URL (optional):", "");
  return value.trim() || undefined;
}

function toImportPath(relativePath: string): string {
  const normalized = relativePath.split(path.sep).join("/");
  return normalized.startsWith(".") ? normalized : `./${normalized}`;
}

function getLocalProxyRouteOutput(proxyBaseUrl: string | undefined): string | null {
  if (!proxyBaseUrl || /^https?:\/\//i.test(proxyBaseUrl)) return null;

  const cleanPath = proxyBaseUrl.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!cleanPath.startsWith("api/")) return null;

  return `./app/${cleanPath}/[...path]/route.ts`;
}

function getOutputDir(configContent: string | null): string | null {
  return configContent?.match(/outputDir:\s*['"]([^'"]+)['"]/)?.[1] || null;
}

function getKnownAccounts(configContent: string | null): { name: string; id: string }[] {
  const matches = [...(configContent?.matchAll(/(\w+):\s*\{\s*accountId:\s*['"]([^'"]+)['"]/g) || [])];
  return matches.map(match => ({ name: match[1], id: match[2] }));
}

async function discoverIds(input: string): Promise<DiscoveredIds> {
  const fromInput = extractIds(input);
  if (fromInput.accountId && fromInput.formId) {
    return fromInput;
  }

  try {
    const response = await fetch(input, {
      headers: {
        Accept: "text/html,application/json",
      },
    });

    const text = await response.text();
    return {
      accountId: fromInput.accountId || extractIds(text).accountId,
      formId: fromInput.formId || extractIds(text).formId,
    };
  } catch {
    return fromInput;
  }
}

function extractIds(value: string): DiscoveredIds {
  const decoded = safeDecode(value);
  const accountId =
    matchFirst(decoded, [
      /\/public-forms\/([^/?#]+)\/forms\/([^/?#]+)/,
      /\/aggregated-availability\/([^/?#]+)/,
      /["']accountId["']\s*:\s*["']([^"']+)["']/,
      /["']account["']\s*:\s*["']([^"']+)["']/,
      /\\["']accountId\\["']\s*:\s*\\["']([^\\]+)\\["']/,
      /\\["']account\\["']\s*:\s*\\["']([^\\]+)\\["']/,
      /[?&]accountId=([^&#]+)/,
      /[?&]account=([^&#]+)/,
      /x-account["']?\s*[:=]\s*["']([^"']+)["']/i,
    ], 1);

  const formId =
    matchFirst(decoded, [
      /\/public-forms\/([^/?#]+)\/forms\/([^/?#]+)/,
      /\/questionnaires\/([^/?#]+)(?:\/|$)/,
      /["']formId["']\s*:\s*["']([^"']+)["']/,
      /["']questionnaireId["']\s*:\s*["']([^"']+)["']/,
      /["']questionnaire["']\s*:\s*\{[^}]*["']id["']\s*:\s*["']([^"']+)["']/,
      /\\["']formId\\["']\s*:\s*\\["']([^\\]+)\\["']/,
      /\\["']questionnaireId\\["']\s*:\s*\\["']([^\\]+)\\["']/,
      /[?&]formId=([^&#]+)/,
      /[?&]questionnaireId=([^&#]+)/,
    ], 1);

  const publicFormsMatch = decoded.match(/\/public-forms\/([^/?#]+)\/forms\/([^/?#]+)/);

  return {
    accountId: cleanId(publicFormsMatch?.[1] || accountId),
    formId: cleanId(publicFormsMatch?.[2] || formId),
  };
}

function matchFirst(value: string, patterns: RegExp[], groupIndex: number): string | undefined {
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[groupIndex]) return match[groupIndex];
  }
  return undefined;
}

function cleanId(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.replace(/\\\//g, "/").split(/[/?#&"']/)[0];
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function fetchQuestionnaire(accountId: string, formId: string): Promise<BloomQuestionnaire> {
  const url = `${BLOOM_BASE_URL}/public-forms/${accountId}/forms/${formId}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Could not fetch Bloom public form config (${response.status}) from ${url}`);
  }

  const data = await response.json() as BloomPublicFormResponse;
  if (!data.questionnaire) {
    throw new Error("Bloom response did not contain a questionnaire.");
  }

  return data.questionnaire;
}

function questionnaireToSteps(questionnaire: BloomQuestionnaire): StepConfig[] {
  const questions = questionnaire.questions || [];
  const usedIds = new Set<string>();

  return questions.map((question, index) => {
    const type = normalizeQuestionType(question);
    const title = plainText(question.title) || `Step ${index + 1}`;
    const id = uniqueId(toCamelCase(title, `step${index + 1}`), usedIds);
    const step: StepConfig = {
      id,
      questionId: question.id,
      title,
      description: plainText(question.description),
      type,
      required: question.isRequired !== false,
    };

    if (type === "multiple_choice") {
      const options = question.options?.fields || [];
      step.singleSelect = !question.options?.allowMultiSelect;
      step.options = options.map(option => ({
        value: option,
        label: humanizeOptionLabel(option),
      }));
    }

    if (type === "personal_info") {
      const fields = question.options?.fields || ["First Name", "Last Name", "Email Address", "Phone Number"];
      step.fields = fields.map(label => ({
        name: fieldNameFromLabel(label),
        label,
        type: fieldInputType(label),
        required: question.isRequired !== false,
      }));
    }

    return step;
  });
}

function normalizeQuestionType(question: BloomQuestion): StepConfig["type"] {
  switch (question.type) {
    case "DATE":
      return "date";
    case "PERSONAL_INFO":
      return "personal_info";
    case "ADDRESS":
      return "address";
    case "MULTIPLE_CHOICE":
    case "SPECIALTY":
      return "multiple_choice";
    case "TEXTUAL":
      return looksLongText(question) ? "textarea" : "text";
    default:
      return "text";
  }
}

function looksLongText(question: BloomQuestion): boolean {
  const value = `${plainText(question.title)} ${plainText(question.description)}`.toLowerCase();
  return /\b(additional|details|message|notes?|describe|comments?)\b/.test(value);
}

function plainText(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.startsWith("{")) return trimmed;
    try {
      return richTextToPlain(JSON.parse(trimmed)).trim();
    } catch {
      return trimmed;
    }
  }

  if (typeof value === "object") {
    return richTextToPlain(value).trim();
  }

  return String(value).trim();
}

function richTextToPlain(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const record = node as { text?: unknown; content?: unknown };
  let result = typeof record.text === "string" ? record.text : "";

  if (Array.isArray(record.content)) {
    result += record.content.map(richTextToPlain).filter(Boolean).join(" ");
  }

  return result.replace(/\s+/g, " ").trim();
}

function uniqueId(base: string, usedIds: Set<string>): string {
  let candidate = base || "step";
  let suffix = 2;
  while (usedIds.has(candidate)) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

function fieldNameFromLabel(label: string): string {
  const normalized = label.toLowerCase();
  if (normalized.includes("first")) return "firstName";
  if (normalized.includes("last")) return "lastName";
  if (normalized.includes("email")) return "email";
  if (normalized.includes("phone") || normalized.includes("mobile")) return "phone";
  return toCamelCase(label, "field");
}

function fieldInputType(label: string): "text" | "email" | "tel" {
  const normalized = label.toLowerCase();
  if (normalized.includes("email")) return "email";
  if (normalized.includes("phone") || normalized.includes("mobile")) return "tel";
  return "text";
}

function humanizeOptionLabel(value: string): string {
  if (value === "I don't know yet.") return "I don't know";
  if (value === "Less then 50") return "Less than 50";
  if (value === "300 Plus") return "300+";
  return value;
}

function printImportSummary(
  accountId: string,
  formId: string,
  componentName: string,
  steps: StepConfig[],
  proxyBaseUrl: string | undefined,
  pageOutputDir: string | null,
  proxyRouteOutput: string | null
): void {
  console.log(chalk.gray(`  Account: ${accountId}`));
  console.log(chalk.gray(`  Form:    ${formId}`));
  console.log(chalk.gray(`  Output:  ${componentName}.tsx`));
  console.log(chalk.gray(`  Proxy:   ${proxyBaseUrl || "set up later"}`));
  if (pageOutputDir) {
    console.log(chalk.gray(`  Page:    ${pageOutputDir}/page.tsx`));
  }
  if (proxyRouteOutput) {
    console.log(chalk.gray(`  API:     ${proxyRouteOutput}`));
  }
  console.log("");
  console.log(chalk.bold("  Detected steps:"));
  for (const step of steps) {
    const extra = step.type === "multiple_choice" && step.options
      ? ` (${step.options.length} options)`
      : step.type === "personal_info" && step.fields
        ? ` (${step.fields.length} fields)`
        : "";
    console.log(chalk.gray(`  - ${step.title} [${step.type}]${extra}`));
  }
  console.log("");
}
