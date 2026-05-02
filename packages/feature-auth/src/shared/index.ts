export type User = {
  id: string;
  name: string;
  email: string;
  image?: string;
};

export type AuthSession = {
  user: User;
  session: {
    id: string;
    expiresAt: Date;
    token: string;
  };
};