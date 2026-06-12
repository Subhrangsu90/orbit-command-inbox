"use client";

import { CalendarDays } from "lucide-react";
import { WorkspaceLayout } from "~/app/_components/WorkspaceLayout";

export default function CalendarPage() {
  return (
    <WorkspaceLayout>
      <div className="max-w-3xl space-y-4">
        <h2 className="font-serif text-3xl font-bold tracking-tight">Calendar Workflows</h2>
        <p className="text-on-surface-variant">
          Configure calendar invites, scheduled alerts, and auto-triage workflows.
        </p>
        <div className="p-12 border border-dashed border-outline-variant bg-surface-container-lowest rounded-2xl flex flex-col items-center justify-center text-center">
          <CalendarDays className="size-12 text-on-surface-variant opacity-60 mb-4 animate-pulse" />
          <p className="font-semibold text-sm">No connected Google Calendar</p>
          <p className="text-xs text-on-surface-variant mt-1 max-w-sm">
            Sync calendar schedules and setup filters for automatic event invitation confirmations.
          </p>
          <button className="mt-4 bg-primary text-on-primary hover:bg-primary-container px-4 py-2 rounded-xl text-xs font-semibold transition shadow-sm">
            Connect Google Calendar
          </button>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
