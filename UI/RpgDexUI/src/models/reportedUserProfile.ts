import { UserSummary } from './userSummary';

export interface ReportedUserProfile {
  userSummary: UserSummary;
  charactersCount: number;
  campaignsCount: number;
  dateTimeOffset: string | null;
}