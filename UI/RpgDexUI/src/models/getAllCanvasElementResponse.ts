import { CanvasElementResponse } from './canvasElementResponse';

export interface GetAllCanvasElementResponse {
  elements: CanvasElementResponse[];
  canvasSizeMb: number;
}
