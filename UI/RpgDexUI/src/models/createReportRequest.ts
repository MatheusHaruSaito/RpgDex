import { ReportEnum } from './reportEnum';

export interface CreateReportRequest {
  title: string;
  description: string;
  dataId: string;
  ReportEnum: ReportEnum;
}
