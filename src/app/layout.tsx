import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { WorkspacePreferencesProvider } from "~/app/_components/workspacePreferencesContext";

export const metadata: Metadata = {
  title: {
    default: "Tacta",
    template: "%s | Tacta",
  },
  description: "A command center for Gmail and Google Calendar.",
  icons: [{ rel: "icon", url: "/icon.svg" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <TRPCReactProvider>
          <WorkspacePreferencesProvider>
            {children}
          </WorkspacePreferencesProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
