import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Set up your Tacta integrations and start optimizing your workspace command workflows.",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
