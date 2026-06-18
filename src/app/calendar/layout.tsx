import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendar",
  description: "View schedules, coordinate invites, and manage events in your smart workspace calendar.",
};

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
