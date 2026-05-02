import { authClient } from "./client";

export function useAuth() {
  const { data: session, isPending } = authClient.useSession();

  const signIn = async (email: string, password: string) => {
    const res = await authClient.signIn.email({ email, password });
    return res;
  };

  const signUp = async (email: string, password: string, name: string) => {
    const res = await authClient.signUp.email({ email, password, name });
    return res;
  };

  const signOut = async () => {
    await authClient.signOut();
  };

  return {
    user: session?.user,
    session,
    isPending,
    signIn,
    signUp,
    signOut,
  };
}
