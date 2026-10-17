export interface CommandModel {
  name: string;
  aliases: string[];
  description: string;
  run(args: string[]): void | string | string[] | number[];
}
