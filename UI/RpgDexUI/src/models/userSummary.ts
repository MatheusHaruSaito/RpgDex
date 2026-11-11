export interface UserSummary {
  id: string;
  userName: string;
  email: string;
  displayName: string;
  iconPath: string | null;
  isLocked: boolean;
}
