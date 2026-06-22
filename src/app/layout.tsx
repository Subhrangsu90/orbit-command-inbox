import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { WorkspacePreferencesProvider } from "~/app/_components/workspacePreferencesContext";
import { NotificationProvider } from "~/app/_components/notificationContext";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.tacta.online"),
  title: {
    default: "Tacta | Intelligent Workspace Command Center",
    template: "%s | Tacta",
  },
  description: "Intelligent command center for Gmail and Google Calendar. Automate email triage, smart event scheduling, and command-based tasks in one minimalist inbox.",
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
      <head>
        {process.env.NODE_ENV === "production" && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                console.log = function() {};
                console.info = function() {};
                console.debug = function() {};
                console.warn = function() {};
              `,
            }}
          />
        )}
      </head>
      <body>
        <TRPCReactProvider>
          <WorkspacePreferencesProvider>
            <NotificationProvider>
              {children}
              <Toaster richColors position="top-right" />
            </NotificationProvider>
          </WorkspacePreferencesProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
