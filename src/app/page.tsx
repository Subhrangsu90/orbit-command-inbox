import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";
import LandingPage from "~/app/_components/landing/LandingPage";

export default async function Home() {
  const session = await getSession();

  if (session) {
    redirect("/chat");
  }

  return <LandingPage />;
}
