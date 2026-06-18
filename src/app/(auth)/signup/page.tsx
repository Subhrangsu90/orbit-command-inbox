import { type Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "~/app/_components/auth-form";
import { AuthShell } from "~/app/_components/auth-shell";
import { getSession } from "~/server/better-auth/server";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your Tacta account to automate email triage and smart calendar scheduling.",
};

export default async function SignupPage() {
  if (await getSession()) redirect("/");

  return (
    <AuthShell>
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
