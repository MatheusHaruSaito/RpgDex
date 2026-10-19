export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  userIcon: string;
  data: string;
  sentAt: Date;
}
