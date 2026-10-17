export interface DiceRollsLogResult {
  userId: string;
  expression: string;
  results: number[];
  total: number;
  createdAt: Date;
}
