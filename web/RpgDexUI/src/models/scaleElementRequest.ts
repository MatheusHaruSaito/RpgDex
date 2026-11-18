export interface ScaleElementRequest {
  campaignId: string;
  items: { id: string; scale: number }[];
}
