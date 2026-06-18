import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Copilot Chat",
  description: "Chat with Tacta Copilot to manage emails, search contacts, and orchestrate calendar events.",
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
