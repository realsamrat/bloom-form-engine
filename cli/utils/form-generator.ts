export interface StepConfig {
  id: string;
  questionId: string;
  title: string;
  description: string;
  type: string;
  singleSelect?: boolean;
  options?: { value: string; label: string }[];
  fields?: { name: string; label: string; type: string; required: boolean }[];
  required?: boolean;
}

interface GenerateFormOptions {
  proxyBaseUrl?: string;
}

function escapeString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function toPascalCase(value: string, fallback = "ImportedBloom"): string {
  const words = value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);

  const result = words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

  return result || fallback;
}

export function toCamelCase(value: string, fallback = "importedBloom"): string {
  const pascal = toPascalCase(value, fallback);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function toKebabCase(value: string, fallback = "bloom-form"): string {
  const words = value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(word => word.toLowerCase());

  return words.join("-") || fallback;
}

export function generateFormComponent(
  name: string,
  accountId: string,
  formId: string,
  steps: StepConfig[],
  successTitle: string,
  successDescription: string,
  options: GenerateFormOptions = {}
): string {
  const configName = `${toCamelCase(name)}Config`;
  const stepsStr = steps.map(step => {
    let stepStr = `    {\n`;
    stepStr += `      id: '${escapeString(step.id)}',\n`;
    stepStr += `      questionId: '${escapeString(step.questionId)}',\n`;
    stepStr += `      title: '${escapeString(step.title)}',\n`;
    stepStr += `      description: '${escapeString(step.description)}',\n`;
    stepStr += `      type: '${escapeString(step.type)}',\n`;

    if (step.singleSelect !== undefined) {
      stepStr += `      singleSelect: ${step.singleSelect},\n`;
    }

    if (step.options) {
      stepStr += `      options: [\n`;
      for (const opt of step.options) {
        stepStr += `        { value: '${escapeString(opt.value)}', label: '${escapeString(opt.label)}' },\n`;
      }
      stepStr += `      ],\n`;
    }

    if (step.fields) {
      stepStr += `      fields: [\n`;
      for (const field of step.fields) {
        stepStr += `        { name: '${escapeString(field.name)}', label: '${escapeString(field.label)}', type: '${escapeString(field.type)}', required: ${field.required} },\n`;
      }
      stepStr += `      ],\n`;
    }

    if (step.required !== undefined) {
      stepStr += `      required: ${step.required},\n`;
    }

    stepStr += `    }`;
    return stepStr;
  }).join(",\n");

  return `"use client";

import { BloomForm } from 'bloom-form-engine';
import type { BloomFormConfig } from 'bloom-form-engine';
import 'bloom-form-engine/src/theme.css';

const ${configName}: BloomFormConfig = {
  accountId: '${escapeString(accountId)}',
  formId: '${escapeString(formId)}',
${options.proxyBaseUrl ? `  proxyBaseUrl: '${escapeString(options.proxyBaseUrl)}',\n` : ""}
  steps: [
${stepsStr},
  ],
  successMessage: {
    title: '${escapeString(successTitle)}',
    description: '${escapeString(successDescription)}',
  },
};

interface ${name}Props {
  stickyFooter?: boolean;
  onSuccess?: () => void;
}

export default function ${name}({ stickyFooter = false, onSuccess }: ${name}Props) {
  return (
    <div className="bf-starter-form-shell">
      <BloomForm config={${configName}} stickyFooter={stickyFooter} onSuccess={onSuccess} />
    </div>
  );
}
`;
}

export function generatePageRoute(componentName: string, componentImportPath: string): string {
  return `import { Inter } from 'next/font/google';
import ${componentName} from '${componentImportPath}';
import 'bloom-form-engine/src/theme.css';

const inter = Inter({ subsets: ['latin'] });

export default function ${componentName}Page() {
  return (
    <main className={\`\${inter.className} bf-starter-page\`}>
      <${componentName} />
    </main>
  );
}
`;
}

export function generateBloomProxyRoute(): string {
  return `import { NextRequest, NextResponse } from 'next/server';

const BLOOM_BASE_URL = 'https://api.bloom.io/api';

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

function fetchWithTimeout(url: string, options: RequestInit, ms = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

async function proxyBloom(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const target = new URL(\`\${BLOOM_BASE_URL}/\${path.join('/')}\`);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  const account = request.headers.get('x-account');

  headers.set('accept', request.headers.get('accept') || 'application/vnd.bloom.v3');
  if (contentType) headers.set('content-type', contentType);
  if (account) headers.set('x-account', account);

  const response = await fetchWithTimeout(target.toString(), {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
    cache: 'no-store',
  });

  const responseHeaders = new Headers(response.headers);
  setCorsHeaders(responseHeaders);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');
  responseHeaders.delete('transfer-encoding');

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyBloom(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyBloom(request, context);
}

export async function OPTIONS() {
  const headers = new Headers();
  setCorsHeaders(headers);
  return new NextResponse(null, { status: 204, headers });
}

function setCorsHeaders(headers: Headers) {
  headers.set('access-control-allow-origin', '*');
  headers.set('access-control-allow-methods', 'GET,POST,OPTIONS');
  headers.set('access-control-allow-headers', 'accept,content-type,x-account');
}
`;
}
