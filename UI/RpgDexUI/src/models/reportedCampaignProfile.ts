import { CampaignCharacterSummary } from "./campaignCharacterSummary";
import { CampaignPlayerSummary } from "./campaignPlayerSummary";
import { UserSummary } from "./userSummary";

export interface ReportedCampaignProfile {
  id: string;
  title: string;
  description: string | null;
  iconPath: string | null;
  isActive: boolean;
  createdAt: string;
  nextSession: string;
  maxPlayers: number;
  gameMaster: UserSummary | null;
  players: CampaignPlayerSummary[];
  characters: CampaignCharacterSummary[];
  pendingCharacterRequests: number;
  messagesCount: number;
}
