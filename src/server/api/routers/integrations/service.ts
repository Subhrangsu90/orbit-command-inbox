import { corsair, ensureCorsairConfigured } from "~/server/corsair";
import { env } from "~/env";
import { generateOAuthUrl } from "corsair/oauth";

export const integrationsService = {
  async getStatus(tenantId: string) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);

    let gmailConnected = false;
    let calendarConnected = false;

    try {
      const gmailToken = await client.gmail.keys.get_refresh_token();
      gmailConnected = Boolean(gmailToken);
    } catch (error) {
      console.error("[integrations.getStatus gmail error]", error);
      gmailConnected = false;
    }

    try {
      const calendarToken =
        await client.googlecalendar.keys.get_refresh_token();
      calendarConnected = Boolean(calendarToken);
    } catch (error) {
      console.error("[integrations.getStatus calendar error]", error);
      calendarConnected = false;
    }

    return {
      gmail: gmailConnected,
      calendar: calendarConnected,
      fullyConnected: gmailConnected && calendarConnected,
    };
  },

  async getGmailConnectUrl(tenantId: string, _redirectTo: string) {
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

  async getCalendarConnectUrl(tenantId: string, _redirectTo: string) {
    await ensureCorsairConfigured();
    const redirectUri = `${env.BETTER_AUTH_URL}/api/corsair/auth/callback`;
    try {
      const { url } = await generateOAuthUrl(corsair, "googlecalendar", {
        tenantId,
        redirectUri,
      });
      return { url };
    } catch (error) {
      console.error("[integrations.getCalendarConnectUrl error]", error);
      throw new Error("Failed to generate Google Calendar connection URL");
    }
  },

  async disconnectGmail(tenantId: string) {
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

  async disconnectCalendar(tenantId: string) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    try {
      await client.googlecalendar.keys.set_access_token(null);
      await client.googlecalendar.keys.set_refresh_token(null);
      return { success: true };
    } catch (error) {
      console.error("[integrations.disconnectCalendar error]", error);
      throw new Error("Failed to disconnect Google Calendar");
    }
  },
};
