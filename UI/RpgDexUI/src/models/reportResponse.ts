import { ReportEnum } from './reportEnum';

export interface ReportResponse {
  id: string;
  title: string;
  description: string;
  reportOwner: string;
  dataId: string;
  reportedUser: string;
  isActive: boolean;
  ReportEnum: ReportEnum;
}
