import { DiceRollEntryDto } from './diceRollEntryDto';

export interface DiceRollsLogResult {
  userId: string;
  expression: string;
  entires: DiceRollEntryDto[];
  createdAt: Date;
}
