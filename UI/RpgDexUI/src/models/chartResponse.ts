import { ChartPoint } from './chartPoint';

export interface ChartResponse {
  points: ChartPoint[];
  total: number;
  totalInRange: number;
}
