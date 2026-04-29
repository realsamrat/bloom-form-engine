declare module "commander" {
  export class Command {
    name(value: string): this;
    description(value: string): this;
    version(value: string): this;
    command(value: string): this;
    argument(flags: string, description?: string): this;
    option(flags: string, description?: string): this;
    action(handler: (...args: any[]) => any): this;
    parse(argv?: string[]): void;
  }
}

declare module "prompts" {
  interface PromptChoice {
    title: string;
    value: string;
  }

  interface PromptQuestion {
    type: string;
    name: string;
    message: string;
    initial?: string | number | boolean;
    choices?: PromptChoice[];
  }

  export default function prompts<T extends string>(
    question: PromptQuestion
  ): Promise<Record<T, any>>;
}
