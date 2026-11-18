import { CharacterPropertyValueEnum } from './CharacterPropertyValueEnum';

export interface CharacterPropertyModel {
  id: string;
  title: string;
  type: CharacterPropertyValueEnum;
  data?: Record<string, string | number | boolean> | string;
}