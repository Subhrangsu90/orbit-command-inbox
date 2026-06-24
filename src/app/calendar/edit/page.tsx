"use client";

import React, { useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WorkspaceLayout } from "~/app/_components/WorkspaceLayout";
import { EventForm } from "../_components/EventForm";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CalendarEditPage() {
  return (
    <Suspense
      fallback={
        <WorkspaceLayout>
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="text-primary size-8 animate-spin" />
              <p className="text-on-surface-variant animate-pulse text-xs font-semibold">
                Loading event editor...
              </p>
            </div>
          </div>
        </WorkspaceLayout>
      }
    >
      <CalendarEditContainer />
    </Suspense>
  );
}

function CalendarEditContainer() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Retrieve query params
  const eventId = searchParams.get("id");
  const calendarId = searchParams.get("calendarId") || "primary";

  // Fetch calendars list
  const { data: calendarListData, isLoading: isLoadingCalendars } =
    api.calendar.listCalendars.useQuery();

  // Fetch event details
  const { data: eventDetails, isLoading: isLoadingEvent } =
    api.calendar.get.useQuery(
      { id: eventId ?? "", calendarId },
      { enabled: !!eventId },
    );

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

  // Update Mutation
  const updateMutation = api.calendar.update.useMutation({
    onSuccess: () => {
      toast.success("Calendar event updated successfully!");
      router.push("/calendar");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update calendar event");
    },
  });

  const handleUpdateSubmit = (data: {
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
    if (!eventId) return;

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
    let cleanDescription = data.description;
    cleanDescription = cleanDescription
      .replace(/\[Calendar:\s*[^\]]+\]/g, "")
      .trim();
    const taggedDescription = selectedCal
      ? `${cleanDescription ? cleanDescription + "\n\n" : ""}[Calendar: ${selectedCal.name}]`
      : cleanDescription;

    const calIdx = allCalendars.findIndex((c) => c.id === data.eventCalendarId);
    const colorId = calIdx >= 0 ? String((calIdx % 8) + 1) : "1";

    updateMutation.mutate({
      calendarId: data.eventCalendarId,
      id: eventId,
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
    if (confirm("Are you sure you want to discard your changes?")) {
      router.push("/calendar");
    }
  };

  if (!eventId) {
    return (
      <WorkspaceLayout>
        <div className="max-w-xl mx-auto p-6 bg-surface-container border border-outline rounded-2xl text-center">
          <p className="text-on-surface text-sm font-semibold">
            Invalid Event Request
          </p>
          <p className="text-on-surface-variant mt-1 text-xs">
            No valid calendar event ID was provided.
          </p>
          <Link
            href="/calendar"
            className="bg-primary text-on-primary hover:bg-primary-container mt-4 inline-flex rounded-xl px-5 py-2.5 text-xs font-semibold shadow-sm transition"
          >
            Back to Calendar
          </Link>
        </div>
      </WorkspaceLayout>
    );
  }

  if (isLoadingCalendars || isLoadingEvent) {
    return (
      <WorkspaceLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="border-primary size-8 animate-spin rounded-full border-2 border-t-transparent" />
            <p className="text-on-surface-variant text-xs">
              Loading calendar event details...
            </p>
          </div>
        </div>
      </WorkspaceLayout>
    );
  }

  if (!eventDetails) {
    return (
      <WorkspaceLayout>
        <div className="max-w-xl mx-auto p-6 bg-surface-container border border-outline rounded-2xl text-center">
          <p className="text-on-surface text-sm font-semibold">
            Event Not Found
          </p>
          <p className="text-on-surface-variant mt-1 text-xs">
            Could not retrieve details for this calendar event. It may have been deleted.
          </p>
          <Link
            href="/calendar"
            className="bg-primary text-on-primary hover:bg-primary-container mt-4 inline-flex rounded-xl px-5 py-2.5 text-xs font-semibold shadow-sm transition"
          >
            Back to Calendar
          </Link>
        </div>
      </WorkspaceLayout>
    );
  }

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
              Edit Calendar Event
            </h2>
            <p className="text-on-surface-variant text-xs">
              Modify the event fields and save your updates.
            </p>
          </div>
        </div>

        <EventForm
          title="Edit Calendar Event"
          submitLabel="Save Changes"
          isPending={updateMutation.isPending}
          myCalendars={myCalendars}
          otherCalendars={otherCalendars}
          defaultDate={new Date()}
          initialEvent={{ ...eventDetails, calendarId }}
          onSubmit={handleUpdateSubmit}
          onCancel={handleCancel}
        />
      </div>
    </WorkspaceLayout>
  );
}
