import { ChatMessage } from './chatMessage';

export interface ChatPagedResultDto {
  items: ChatMessage[];
  nextCursor?: string;
  hasMore: boolean;
}
