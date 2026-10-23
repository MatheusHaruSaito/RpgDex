import { ChartPoint } from './ChartPoint';

export interface CharacterChartResponse {
  points: ChartPoint[];
  total: number;
  usersInRange: number;
}
