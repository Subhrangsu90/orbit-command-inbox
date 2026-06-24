"use client";

import React, { useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WorkspaceLayout } from "~/app/_components/WorkspaceLayout";
import { EventForm } from "../_components/EventForm";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CalendarCreatePage() {
  return (
    <Suspense
      fallback={
        <WorkspaceLayout>
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="text-primary size-8 animate-spin" />
              <p className="text-on-surface-variant animate-pulse text-xs font-semibold">
                Loading event creator...
              </p>
            </div>
          </div>
        </WorkspaceLayout>
      }
    >
      <CalendarCreateContainer />
    </Suspense>
  );
}

function CalendarCreateContainer() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Retrieve query params
  const dateParam = searchParams.get("date");
  const calendarIdParam = searchParams.get("calendarId");

  const defaultDate = useMemo(() => {
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  }, [dateParam]);

  // Fetch calendars list
  const { data: calendarListData, isLoading: isLoadingCalendars } =
    api.calendar.listCalendars.useQuery();

  const { myCalendars, otherCalendars, allCalendars } = useMemo(() => {
    if (!calendarListData?.calendars) {
      return { myCalendars: [], otherCalendars: [], allCalendars: [] };
    }

    const COLOR_KEYS = [
      "blue",
      "green",
      "forest",
      "indigo",
      "teal",
      "sky",
      "rose",
      "orange",
    ] as const;

    const mapped = calendarListData.calendars.map((cal, idx) => {
      const color = COLOR_KEYS[idx % COLOR_KEYS.length]!;
      return {
        id: cal.id as string,
        name: cal.summaryOverride || cal.summary || "Unnamed Calendar",
        color,
        primary: !!cal.primary,
        accessRole: cal.accessRole as string,
      };
    });

    const my: typeof mapped = [];
    const other: typeof mapped = [];

    mapped.forEach((cal) => {
      const isMy =
        cal.primary ||
        cal.accessRole === "owner" ||
        cal.accessRole === "writer" ||
        cal.id === "addressbook#contacts@group.v.calendar.google.com" ||
        cal.id.includes("tasks") ||
        cal.id.includes("contacts");

      if (isMy) {
        my.push(cal);
      } else {
        other.push(cal);
      }
    });

    return { myCalendars: my, otherCalendars: other, allCalendars: mapped };
  }, [calendarListData]);

  // Create Mutation
  const createMutation = api.calendar.create.useMutation({
    onSuccess: () => {
      toast.success("Calendar event created successfully!");
      router.push("/calendar");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create calendar event");
    },
  });

  const handleCreateSubmit = (data: {
    summary: string;
    description: string;
    location: string;
    startDate: string;
    startTimeInput: string;
    endDate: string;
    endTimeInput: string;
    attendeesInput: string;
    eventCalendarId: string;
  }) => {
    const startISO = new Date(
      `${data.startDate}T${data.startTimeInput}:00`,
    ).toISOString();
    const endISO = new Date(
      `${data.endDate}T${data.endTimeInput}:00`,
    ).toISOString();
    const attendees = data.attendeesInput
      ? data.attendeesInput
          .split(",")
          .map((email) => email.trim())
          .filter(Boolean)
      : [];

    const selectedCal = allCalendars.find((c) => c.id === data.eventCalendarId);
    const taggedDescription = selectedCal
      ? `${data.description ? data.description + "\n\n" : ""}[Calendar: ${selectedCal.name}]`
      : data.description;

    const calIdx = allCalendars.findIndex((c) => c.id === data.eventCalendarId);
    const colorId = calIdx >= 0 ? String((calIdx % 8) + 1) : "1";

    createMutation.mutate({
      calendarId: data.eventCalendarId,
      summary: data.summary,
      description: taggedDescription,
      location: data.location || undefined,
      startTime: startISO,
      endTime: endISO,
      attendees: attendees.length > 0 ? attendees : undefined,
      colorId,
    });
  };

  const handleCancel = () => {
    if (confirm("Are you sure you want to discard your draft?")) {
      router.push("/calendar");
    }
  };

  if (isLoadingCalendars) {
    return (
      <WorkspaceLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="border-primary size-8 animate-spin rounded-full border-2 border-t-transparent" />
            <p className="text-on-surface-variant text-xs">
              Loading calendar options...
            </p>
          </div>
        </div>
      </WorkspaceLayout>
    );
  }

  // Pre-selected calendar ID
  const initialEventMock = calendarIdParam
    ? { calendarId: calendarIdParam }
    : undefined;

  return (
    <WorkspaceLayout>
      <div className="max-w mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/calendar"
            className="flex size-9 items-center justify-center rounded-xl border border-outline-variant bg-surface hover:bg-surface-container-high transition-colors"
          >
            <ArrowLeft className="size-4 text-on-surface" />
          </Link>
          <div>
            <h2 className="text-on-surface text-lg font-bold tracking-tight">
              Create New Event
            </h2>
            <p className="text-on-surface-variant text-xs">
              Fill details to add to your calendar schedule.
            </p>
          </div>
        </div>

        <EventForm
          title="New Calendar Event"
          submitLabel="Create Event"
          isPending={createMutation.isPending}
          myCalendars={myCalendars}
          otherCalendars={otherCalendars}
          defaultDate={defaultDate}
          initialEvent={initialEventMock}
          onSubmit={handleCreateSubmit}
          onCancel={handleCancel}
        />
      </div>
    </WorkspaceLayout>
  );
}
