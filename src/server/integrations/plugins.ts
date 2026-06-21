import { gmailPlugin, gmailCredentials } from "./gmail/plugin";
import { calendarPlugin, calendarCredentials } from "./googlecalendar/plugin";

/** All corsair plugins (for createCorsair({ plugins })). */
export function allCorsairPlugins() {
  return [gmailPlugin, calendarPlugin] as const;
}

/** All corsair credentials keyed by provider (for setupCorsair({ credentials })). */
export function allCorsairCredentials(
  env: any,
): Record<string, Record<string, string>> {
  return {
    gmail: gmailCredentials(env) as Record<string, string>,
    googlecalendar: calendarCredentials(env) as Record<string, string>,
  };
}
