export interface UserResponse {
  id: string;
  userName: string;
  displayName: string;
  email: string;
  roles: string | string[];
  iconPath: string | undefined;
}
