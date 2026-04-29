import prompts from "prompts";

export async function askText(message: string, initial?: string): Promise<string> {
  const response = await prompts({
    type: "text",
    name: "value",
    message,
    initial,
  });

  if (response.value === undefined) {
    console.log("\nSetup cancelled.");
    process.exit(0);
  }

  return response.value;
}

export async function askNumber(message: string, initial?: number): Promise<number> {
  const response = await prompts({
    type: "number",
    name: "value",
    message,
    initial,
  });

  if (response.value === undefined) {
    console.log("\nSetup cancelled.");
    process.exit(0);
  }

  return response.value;
}

export async function askSelect(message: string, choices: { title: string; value: string }[]): Promise<string> {
  const response = await prompts({
    type: "select",
    name: "value",
    message,
    choices,
  });

  if (response.value === undefined) {
    console.log("\nSetup cancelled.");
    process.exit(0);
  }

  return response.value;
}

export async function askConfirm(message: string, initial = true): Promise<boolean> {
  const response = await prompts({
    type: "confirm",
    name: "value",
    message,
    initial,
  });

  if (response.value === undefined) {
    console.log("\nSetup cancelled.");
    process.exit(0);
  }

  return response.value;
}
