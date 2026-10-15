import { UserSummary } from "./userSummary";

export interface CampaignPlayerSummary {
  user: UserSummary;
  characterIds: string[];
}