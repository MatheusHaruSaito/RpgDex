import { Campaign } from './campaign';

export interface GetAllCampaignResponse {
  campaigns: Campaign[];
  maxCampaigns: number;
  campaignGameMasterLength: number;
  campaignPlayerLength: number;
}
