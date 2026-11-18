import { Character } from './character';

export interface GetAllCharacterResponse {
  characters: Character[];
  maxCharacters: number;
  characterLength: number;
}
