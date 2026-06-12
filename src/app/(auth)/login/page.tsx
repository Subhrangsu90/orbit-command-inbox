import { redirect } from "next/navigation";

import { AuthForm } from "~/app/_components/auth-form";
import { AuthShell } from "~/app/_components/auth-shell";
import { getSession } from "~/server/better-auth/server";

export default async function LoginPage() {
  if (await getSession()) redirect("/");

  return (
    <AuthShell>
      <AuthForm mode="login" />
    </AuthShell>
  );
}
