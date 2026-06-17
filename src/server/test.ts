import "dotenv/config";
import { corsair, ensureCorsairConfigured } from "./corsair.js";

async function getGoogleCalendarAccessToken(client: any) {
  const [s, c, d] = await Promise.all([
    client.googlecalendar.keys.get_access_token(),
    client.googlecalendar.keys.get_expires_at(),
    client.googlecalendar.keys.get_refresh_token(),
  ]);
  if (!d) throw new Error("No refresh token");
  const creds = await client.googlecalendar.keys.get_integration_credentials();
  
  const now = Math.floor(Date.now() / 1000);
  if (s && c && Number(c) > now + 300) {
    return s;
  }
  
  console.log("Refreshing token...");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      refresh_token: d,
      grant_type: "refresh_token",
    }),
  });
  
  if (!res.ok) {
    throw new Error(`Failed to refresh token: ${await res.text()}`);
  }
  
  const data = (await res.json()) as { access_token: string; expires_in: number };
  await Promise.all([
    client.googlecalendar.keys.set_access_token(data.access_token),
    client.googlecalendar.keys.set_expires_at(String(now + data.expires_in)),
  ]);
  
  return data.access_token;
}

import { calendarService } from "./api/routers/calendar/service.js";

async function main() {
  await ensureCorsairConfigured();
  const tenantId = "dEm4pbtfLrTqheuMfqQzVASeTET1mhi7";
  const client = corsair.withTenant(tenantId);
  
  const token = await getGoogleCalendarAccessToken(client);
  
  const res = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (!res.ok) {
    throw new Error(`Google Calendar API error: ${await res.text()}`);
  }
  
  const data = await res.json();
  const calendars = data.items ?? [];
  const calendarIds = calendars.map((c: any) => c.id);
  console.log(`Querying events for ${calendarIds.length} calendars...`);
  
  const start = Date.now();
  const result = await calendarService.list(tenantId, {
    calendarIds,
    timeMin: new Date().toISOString(),
    maxResults: 100,
  });
  
  console.log(`Completed in ${Date.now() - start}ms`);
  console.log(`Success: Found ${(result.events ?? []).length} events`);
  if (result.notConnected) {
    console.log("Returned notConnected = true");
  }
}

main().catch(console.error).finally(() => process.exit());
