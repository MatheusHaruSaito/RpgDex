import { Campaign } from './campaign';

export interface GetAllCampaignResponse {
  campaigns: Campaign[];
  maxCampaigns: number;
  campaignLength: number;
}
