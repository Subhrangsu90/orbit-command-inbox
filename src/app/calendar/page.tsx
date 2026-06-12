"use client";

import Link from "next/link";
import { CalendarDays, CheckCircle2, AlertCircle } from "lucide-react";
import { WorkspaceLayout } from "~/app/_components/WorkspaceLayout";
import { api } from "~/trpc/react";

export default function CalendarPage() {
  const { data: connections, isLoading } = api.corsair.getConnections.useQuery();
  const isConnected = !!connections?.googlecalendar;

  return (
    <WorkspaceLayout>
      <div className="max-w-3xl space-y-6">
        <div className="space-y-2">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-on-surface">
            Calendar Workflows
          </h2>
          <p className="text-sm text-on-surface-variant">
            Configure calendar invites, scheduled alerts, and auto-triage workflows.
          </p>
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-outline-variant bg-surface-container-lowest">
            <div className="flex flex-col items-center gap-2">
              <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs text-on-surface-variant">Checking connection...</p>
            </div>
          </div>
        ) : isConnected ? (
          <div className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-surface-container-lowest to-primary/5 shadow-md">
            <div className="p-8 md:p-12 flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <CheckCircle2 className="size-8" />
              </div>
              <div className="flex-1 text-center md:text-left space-y-2">
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <h3 className="text-lg font-bold text-on-surface">Google Calendar Connected</h3>
                  <span className="inline-flex self-center items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-2xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant max-w-md">
                  Your calendar is linked. The system will automatically process scheduled invites and manage event responses.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 border border-dashed border-outline-variant bg-surface-container-lowest rounded-2xl flex flex-col items-center justify-center text-center">
            <div className="relative mb-4">
              <CalendarDays className="size-12 text-on-surface-variant opacity-60" />
              <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-surface-container-lowest">
                <AlertCircle className="size-4 text-warning" />
              </span>
            </div>
            <p className="font-semibold text-sm text-on-surface">Google Calendar disconnected</p>
            <p className="text-xs text-on-surface-variant mt-1 max-w-sm">
              Please go to settings page to connect your Google Calendar and setup workflows.
            </p>
            <Link
              href="/settings"
              className="mt-4 inline-flex bg-primary text-on-primary hover:bg-primary-container px-5 py-2.5 rounded-xl text-xs font-semibold transition shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            >
              Go to Settings
            </Link>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
