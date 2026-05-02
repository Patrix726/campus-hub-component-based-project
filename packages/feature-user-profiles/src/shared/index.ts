export type Profile = {
  id: string;
  userId: string;
  bio?: string;
  major?: string;
  year?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type UpdateProfileInput = {
  bio?: string;
  major?: string;
  year?: string;
  avatar?: string;
};