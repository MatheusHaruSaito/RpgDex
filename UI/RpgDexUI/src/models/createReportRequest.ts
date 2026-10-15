import { ReportType } from './reportType';

export interface CreateReportRequest {
  title: string;
  description: string;
  dataId: string;
  ReportEnum: ReportType;
}
