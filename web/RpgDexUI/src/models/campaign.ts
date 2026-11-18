export interface Campaign {
  id: string;
  title: string;
  description?: string;
  isActive: boolean;
  gameMasterId: string;
  nextSession: Date;
  createdAt: Date;
  iconPath: string;
  maxPlayers: number;
  playerIds?: string[];
  characterIds?: string[];
  characterRequests?: string[];
  requireApprovalForCharacters?: boolean; 
}