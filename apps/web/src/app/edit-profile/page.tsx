import { headers } from "next/headers";
import { redirect } from "next/navigation";
import EditProfileForm from "@/components/edit-profile-form";
import { authClient } from "@/lib/auth-client";

export default async function EditProfile() {
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
    <EditProfileForm
      user={{
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image!,
      }}
    />
  );
}

