import { ReportType } from './reportType';

export interface CreateReportRequest {
  title: string;
  description: string;
  targetId: string;
  reportType: ReportType;
  image?: File;
}
