import { corsair } from "~/server/corsair";
import { env } from "~/env";
import { generateOAuthUrl } from "corsair/oauth";

export const integrationsService = {
  async getStatus(tenantId: string) {
    const client = corsair.withTenant(tenantId);

    let gmailConnected = false;
    let calendarConnected = false;

    try {
      const gmailToken = await client.gmail.keys.get_access_token();
      gmailConnected = gmailToken !== null;
    } catch (error) {
      console.error("[integrations.getStatus gmail error]", error);
      gmailConnected = false;
    }

    try {
      const calendarToken = await client.googlecalendar.keys.get_access_token();
      calendarConnected = calendarToken !== null;
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

  async getGmailConnectUrl(tenantId: string, redirectTo: string) {
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

  async getCalendarConnectUrl(tenantId: string, redirectTo: string) {
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
