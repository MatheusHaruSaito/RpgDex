export interface CreateCanvaTokenElementRequest {
  campaignId: string;
  characterId: string;
  x: number;
  y: number;
  z: number;
  scale: number;
  content?: string;
  color?: string;
}
