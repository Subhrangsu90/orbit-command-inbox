import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description: "Configure your Tacta workspace preferences, keyboard shortcuts, and connected accounts.",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
