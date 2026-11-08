export interface ReOrderCanvaElementsRequest {
  campaignId: string;
  items: { id: string; z: number }[];
}
