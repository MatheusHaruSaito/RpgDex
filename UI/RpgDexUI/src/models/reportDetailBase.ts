import { ReportedCampaignProfile } from './reportedCampaignProfile';
import { ReportedCharacterProfile } from './reportedCharacterProfile';
import { ReportedUserProfile } from './reportedUserProfile';
import { ReportType } from './reportType';
import { ReportOwner } from './reportOwner';

interface ReportDetailBase {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  reportOwner: ReportOwner;
  imagePaths?: string[] | null;
  imagePath?: string | null;
}

export type ReportDetail = ReportDetailBase &
  (
    | { reportType: ReportType.UserReport; target: ReportedUserProfile | null }
    | { reportType: ReportType.CampaignReport; target: ReportedCampaignProfile | null }
    | { reportType: ReportType.CharacterReport; target: ReportedCharacterProfile | null }
  );