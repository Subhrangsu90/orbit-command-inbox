import { GmailIcon, GoogleCalendarIcon } from "~/app/_components/ui/icons";

export const INTEGRATIONS = [
  {
    id: "gmail" as const,
    provider: "gmail" as const,
    title: "Gmail",
    onboardingDesc: "Read, route, and compose emails automatically via command rules.",
    settingsDesc: "Read, send, and manage your emails",
    Icon: GmailIcon,
  },
  {
    id: "calendar" as const,
    provider: "calendar" as const,
    title: "Google Calendar",
    onboardingDesc: "Synchronize events, process scheduled invites, and confirm slots.",
    settingsDesc: "View and create calendar events",
    Icon: GoogleCalendarIcon,
  },
];

export type IntegrationProvider = typeof INTEGRATIONS[number]["provider"];
