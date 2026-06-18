import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Mailbox",
  description: "Manage your emails with Tacta's automated priority sorting, AI triage, and semantic search.",
};

export default function MailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
