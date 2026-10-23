import { ChartPoint } from './ChartPoint';

export interface CampaignChartResponse {
  points: ChartPoint[];
  total: number;
  totalInRange: number;
}
