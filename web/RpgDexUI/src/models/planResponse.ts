import { PlanTagType } from './planTagType';

export interface PlanResponse {
  id: string;
  name: string;
  description: string;
  price: number;
  hasEarlyAccess: boolean;
  characterQty: number;
  campaignQty: number;
  documentsSpaceMB: number;
  canvasSpaceMb: number;
  durationDays: number;
  tags: PlanTagType[];
}
