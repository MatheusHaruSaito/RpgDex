export interface MoveCanvaElementsRequest {
  campaignId: string;
  items: { id: string; x: number; y: number }[];
}
