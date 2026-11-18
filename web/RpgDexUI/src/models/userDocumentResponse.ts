export interface UserDocumentResponse {
  id: string;
  name: string;
  userId: string;
  description: string;
  filePath: string;
  fileName: string;
  fileSize: string;
  isActive: boolean;
  createdAt: Date;
}
