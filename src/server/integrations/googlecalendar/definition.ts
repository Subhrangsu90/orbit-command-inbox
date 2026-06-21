import type { IntegrationDefinition } from "../types";
import { corsair, ensureCorsairConfigured } from "~/server/corsair";
import { generateOAuthUrl } from "corsair/oauth";
import { env } from "~/env";

export const calendarDefinition: IntegrationDefinition = {
  id: "calendar",
  label: "Google Calendar",

  async getStatus(tenantId) {
    await ensureCorsairConfigured();
    const client = corsair.withTenant(tenantId);
    try {
      const token = await client.googlecalendar.keys.get_refresh_token();
      if (!token) {
        return { connected: false };
      }
      try {
        const { calendarService } = await import(
          "~/server/api/routers/calendar/service"
        );
        const listRes = await calendarService.listCalendars(tenantId);
        if (listRes.calendars) {
          const primaryCal = listRes.calendars.find((c: any) => c.primary);
          return {
            connected: true,
            accountEmail: primaryCal?.id ?? null,
            accountName: primaryCal?.summary ?? null,
          };
        }
      } catch (err) {
        // Fallback
      }
      return {
        connected: true,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (!msg.includes("Account not found")) {
        console.error("[integrations.getStatus calendar error]", error);
      }
      return { connected: false };
    }
  },

  async getConnectUrl(tenantId, _redirectTo) {
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

  async disconnect(tenantId) {
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
