import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ProfilePage from "@/components/profile-page";
import { authClient } from "@/lib/auth-client";

export default async function Profile() {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <ProfilePage
      user={{
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image!,
      }}
    />
  );
}

