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
  imageBase64?: string;
  points?: { x: number; y: number }[];
  strokeWidth?: number;
}
