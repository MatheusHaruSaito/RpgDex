import { ReportResponse } from './reportResponse';

export interface GetAllReportResponse {
  reports: ReportResponse[];
  count: number;
}
