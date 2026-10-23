import { ChartPoint } from './ChartPoint';

export interface UserChartResponse {
  points: ChartPoint[];
  total: number;
  totalInRange: number;
}
