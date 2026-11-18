export interface CreateCharacter {
  icon: File;
  name: string;
  description?: string;
  properties?: Record<string, any>;
}
