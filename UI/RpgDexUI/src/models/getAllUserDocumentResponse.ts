import { UserDocumentResponse } from './userDocumentResponse';

export interface GetAllUserDocumentResponse {
  elements: UserDocumentResponse[];
  canvasSizeMb: number;
  campaignStorageCapaity: number;
}
