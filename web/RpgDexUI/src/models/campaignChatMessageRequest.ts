export interface CampaignChatMessageRequest {
  campaignId: string;
  characterId: string | null;
  message: string;
}
