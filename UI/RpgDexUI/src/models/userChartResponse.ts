import { UserChartPoint } from './userChartPoint';

export interface UserChartResponse {
  points: UserChartPoint[];
  total: number;
  usersInRange: number;
}
