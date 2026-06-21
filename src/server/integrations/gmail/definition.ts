import type { IntegrationDefinition } from "../types";
import { corsair, ensureCorsairConfigured } from "~/server/corsair";
import { generateOAuthUrl } from "corsair/oauth";
import { env } from "~/env";

export const gmailDefinition: IntegrationDefinition = {
  id: "gmail",
  label: "Gmail",

  async getStatus(tenantId) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    try {
      const token = await client.gmail.keys.get_refresh_token();
      if (!token) {
        return { connected: false };
      }
      try {
        const usersApi = client.gmail.api as unknown as {
          users?: {
            getProfile?: (input: { userId: string }) => Promise<{
              emailAddress?: string;
            }>;
            settings?: {
              sendAs?: {
                list?: (input: { userId: string }) => Promise<{
                  sendAs?: Array<{
                    sendAsEmail?: string;
                    displayName?: string;
                    isPrimary?: boolean;
                    isDefault?: boolean;
                  }>;
                }>;
              };
            };
          };
        };
        const profile = await usersApi.users?.getProfile?.({ userId: "me" });
        const email = profile?.emailAddress?.trim() || null;
        let name: string | null = null;
        try {
          const sendAsRes = await usersApi.users?.settings?.sendAs?.list?.({
            userId: "me",
          });
          const primarySendAs = sendAsRes?.sendAs?.find(
            (s: any) =>
              s.isPrimary ||
              s.isDefault ||
              s.sendAsEmail?.trim().toLowerCase() === email?.toLowerCase()
          );
          if (primarySendAs?.displayName) {
            name = primarySendAs.displayName.trim();
          }
        } catch (err) {
          // ignore errors fetching sendAs settings
        }

        return {
          connected: true,
          accountEmail: email,
          accountName: name,
        };
      } catch (err) {
        return {
          connected: true,
        };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (!msg.includes("Account not found")) {
        console.error("[integrations.getStatus gmail error]", error);
      }
      return { connected: false };
    }
  },

  async getConnectUrl(tenantId, _redirectTo) {
    await ensureCorsairConfigured();
    const redirectUri = `${env.BETTER_AUTH_URL}/api/corsair/auth/callback`;
    try {
      const { url } = await generateOAuthUrl(corsair, "gmail", {
        tenantId,
        redirectUri,
      });
      return { url };
    } catch (error) {
      console.error("[integrations.getGmailConnectUrl error]", error);
      throw new Error("Failed to generate Gmail connection URL");
    }
  },

  async disconnect(tenantId) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    try {
      await client.gmail.keys.set_access_token(null);
      await client.gmail.keys.set_refresh_token(null);
      return { success: true };
    } catch (error) {
      console.error("[integrations.disconnectGmail error]", error);
      throw new Error("Failed to disconnect Gmail");
    }
  },
};
