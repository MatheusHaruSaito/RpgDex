export interface Character {
  id: string;
  userId: string;
  iconPath: string;
  name: string;
  createdAt: Date;
  description?: string;
  lastAccess: Date;
  properties?: Record<string, any>;
}
