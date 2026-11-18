export interface UpdateCampaignRequest {
  id: string;
  title: string;
  description?: string;
  nextSession: Date;
  icon: File;
  maxPlayers: number;
  newPassword: string;
}
