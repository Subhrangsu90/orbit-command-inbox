import { type Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "~/app/_components/auth-form";
import { AuthShell } from "~/app/_components/auth-shell";
import { getSession } from "~/server/better-auth/server";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Tacta account to access your workspace command center.",
};

export default async function LoginPage() {
  if (await getSession()) redirect("/");

  return (
    <AuthShell>
      <AuthForm mode="login" />
    </AuthShell>
  );
}
