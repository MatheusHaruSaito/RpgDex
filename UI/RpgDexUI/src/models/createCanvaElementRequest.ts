import { CanvasElementType } from './canvasElementType';

export interface CreateCanvaElementRequest {
  campaignId: string;
  elementType: CanvasElementType;
  x: number;
  y: number;
  z: number;
  scale: number;
  content?: string;
  color?: string;
  image?: string;
  points?: { x: number; y: number }[];
  strokeWidth?: number;
}
