export interface CommandModel {
  name: string;
  aliases: string[];
  description: string;
  run(args: string[]): string | string[];
}
