export type FileRecord = {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  ownerId: string;
  createdAt: Date;
};

export type UploadFileResponse = FileRecord;
export type ListFilesResponse = FileRecord[];
