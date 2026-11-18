import { CharacterPropertyOrganizationEnum } from './characterPropertyOrganizationEnum';

export interface CharacterPropertyOrganization {
  id: string;
  title: string;
  type: CharacterPropertyOrganizationEnum;
  data?: Record<string, any> | CharacterPropertyOrganization[];
}
