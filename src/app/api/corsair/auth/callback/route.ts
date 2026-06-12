import { NextResponse } from "next/server";
import { corsair } from "~/server/corsair";
import { processOAuthCallback } from "corsair/oauth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      return new Response("Missing code or state parameter", { status: 400 });
    }

    const redirectUri = `${new URL(request.url).origin}/api/corsair/auth/callback`;

    const result = await processOAuthCallback(corsair, {
      code,
      state,
      redirectUri,
    });

    // Determine target page based on plugin name
    const targetPath = result.plugin === "googlecalendar" ? "/calendar" : "/";
    return NextResponse.redirect(`${new URL(request.url).origin}${targetPath}`);
  } catch (error) {
    console.error("Failed to process OAuth callback:", error);
    return new Response("OAuth Callback Failed", { status: 500 });
  }
}
