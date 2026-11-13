import { UserSummary } from "./userSummary";

export interface ReportedCharacterProfile {
  id: string;
  name: string;
  iconPath: string | null;
  description: string;
  isActive: boolean;
  createdAt: string;
  lastAccess: string;
  owner: UserSummary | null;
  properties: Record<string, unknown>;
}