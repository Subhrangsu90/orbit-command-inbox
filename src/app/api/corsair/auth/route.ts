import { NextResponse } from "next/server";
import { getSession } from "~/server/better-auth/server";
import { corsair } from "~/server/corsair";
import { generateOAuthUrl } from "corsair/oauth";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const plugin = searchParams.get("plugin");
    if (!plugin || (plugin !== "gmail" && plugin !== "googlecalendar")) {
      return new Response("Invalid plugin specified", { status: 400 });
    }

    const tenantId = session.user.id;
    const redirectUri = `${new URL(request.url).origin}/api/corsair/auth/callback`;

    const { url } = await generateOAuthUrl(corsair, plugin, {
      tenantId,
      redirectUri,
    });

    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Failed to generate OAuth URL:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
