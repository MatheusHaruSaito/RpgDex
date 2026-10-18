import { CanvasElementType } from './canvasElementType';

export interface CreateCanvaElementRequest {
  campaignId: string;
  type: CanvasElementType;
  x: number;
  y: number;
  z: number;
  scale: number;
  content?: string;
  color?: string;
  image: File;
  points?: { x: number; y: number }[];
  strokeWidth?: number;
}
