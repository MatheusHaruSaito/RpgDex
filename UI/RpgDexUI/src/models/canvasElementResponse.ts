import { CanvasElementType } from './canvasElementType';

export interface CanvasElementResponse {
  id: string;
  type: CanvasElementType;
  x: number;
  y: number;
  z: number;
  scale: number;
  content?: string;
  color?: string;
  imageUrl?: string;
  points?: { x: number; y: number }[];
  strokeWidth?: number;
}
