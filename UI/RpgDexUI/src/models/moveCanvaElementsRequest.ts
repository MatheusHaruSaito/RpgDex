export interface MoveCanvaElementsRequest {
  campaignId: string;
  items: { id: number; x: number; y: number }[];
}
