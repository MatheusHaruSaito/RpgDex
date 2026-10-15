import { ReportedCampaignProfile } from './reportedCampaignProfile';
import { ReportedCharacterProfile } from './reportedCharacterProfile';
import { ReportType } from './reportType';
import { ReportOwner } from './reportOwner';
import { UserSummary } from './userSummary';

interface ReportDetailBase {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  reportOwner: ReportOwner;
}
export type ReportDetail = ReportDetailBase &
  (
    | { reportType: ReportType.UserReport; target: UserSummary | null }
    | { reportType: ReportType.CampaignReport; target: ReportedCampaignProfile | null }
    | { reportType: ReportType.CharacterReport; target: ReportedCharacterProfile | null }
  );
