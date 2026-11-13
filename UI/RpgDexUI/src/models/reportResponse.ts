import { ReportType } from './reportType';

export interface ReportResponse {
  id: string;
  title: string;
  description: string;
  reportOwner: string;
  targetId: string;
  reportedUser: string;
  isActive: boolean;
  reportType: ReportType;
  imagePath: string | null;
}