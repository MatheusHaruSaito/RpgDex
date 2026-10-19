export interface UpdateCanvaElementRequest {
  id: string;
  campaignId: string;
  scale: number;
  content?: string;
  color?: string;
  image?: string;
  points?: { x: number; y: number }[];
  strokeWidth?: number;
}
