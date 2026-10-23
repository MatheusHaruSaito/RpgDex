import { ChartPoint } from './ChartPoint';

export interface CharacterChartResponse {
  points: ChartPoint[];
  total: number;
  totalInRange: number;
}
