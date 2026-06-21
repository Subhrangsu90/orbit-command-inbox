"use client";

import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "~/app/_components/ui/button";
import { GmailIcon, GoogleCalendarIcon } from "~/app/_components/ui/icons";
import { api } from "~/trpc/react";

interface IntegrationConnectionListProps {
  variant: "settings" | "onboarding";
}

const INTEGRATIONS = [
  {
    id: "gmail" as const,
    provider: "gmail" as const,
    title: "Gmail",
    onboardingDesc: "Read, route, and compose emails automatically via command rules.",
    settingsDesc: "Read, send, and manage your emails",
    Icon: GmailIcon,
  },
  {
    id: "calendar" as const,
    provider: "calendar" as const,
    title: "Google Calendar",
    onboardingDesc: "Synchronize events, process scheduled invites, and confirm slots.",
    settingsDesc: "View and create calendar events",
    Icon: GoogleCalendarIcon,
  },
];

export function IntegrationConnectionList({ variant }: IntegrationConnectionListProps) {
  const { data: connections, isLoading, error, refetch } = api.integrations.getStatus.useQuery();

  const getConnectUrlMutation = api.integrations.getConnectUrl.useMutation();
  const disconnectMutation = api.integrations.disconnect.useMutation({
    onSuccess: () => void refetch(),
  });

  const handleConnect = async (provider: "gmail" | "calendar") => {
    try {
      const { url } = await getConnectUrlMutation.mutateAsync({
        provider,
        redirectTo: "/chat",
      });
      window.location.href = url;
    } catch (e) {
      console.error(`Failed to generate connect URL for ${provider}:`, e);
    }
  };

  const handleDisconnect = async (provider: "gmail" | "calendar") => {
    try {
      await disconnectMutation.mutateAsync({ provider });
    } catch (e) {
      console.error(`Failed to disconnect ${provider}:`, e);
    }
  };

  if (isLoading) {
    if (variant === "onboarding") {
      return (
        <div className="flex flex-col items-center gap-2 py-8">
          <div className="border-primary size-8 animate-spin rounded-full border-2 border-t-transparent" />
          <p className="text-on-surface-variant text-xs">Checking connections...</p>
        </div>
      );
    }
    return (
      <div className="text-on-surface-variant flex items-center gap-3 py-6 text-xs">
        <span className="border-primary size-4 animate-spin rounded-full border-2 border-t-transparent" />
        Checking connections...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error/10 border-error/20 text-error flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium">
        <AlertCircle className="size-4 shrink-0" />
        Failed to load integration status: {error.message ?? "Unknown error"}
      </div>
    );
  }

  if (variant === "onboarding") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
        {INTEGRATIONS.map((item) => {
          const isConnected = !!connections?.[item.id];
          const detailsKey = `${item.id}Details` as const;
          const details = connections?.[detailsKey] as { accountEmail?: string | null; accountName?: string | null } | undefined;
          const isConnecting = getConnectUrlMutation.isPending && getConnectUrlMutation.variables?.provider === item.provider;
          const isDisconnecting = disconnectMutation.isPending && disconnectMutation.variables?.provider === item.provider;

          return (
            <div
              key={item.id}
              className={`p-6 border rounded-2xl flex flex-col justify-between gap-6 transition-all duration-200 ${
                isConnected
                  ? "bg-primary/5 border-primary/20 shadow-sm"
                  : "bg-surface-container-low border-outline-variant hover:border-outline"
              }`}
            >
              <div className="space-y-3">
                <div className="size-10 rounded-xl grid place-items-center bg-surface-container-high border border-outline-variant shadow-inner p-2.5">
                  <item.Icon className="size-full" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-on-surface">{item.title}</h3>
                  <p className="text-2xs text-on-surface-variant leading-relaxed mt-1">
                    {item.onboardingDesc}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                {isConnected ? (
                  <div className="flex flex-col gap-2">
                    <span className="inline-flex self-start items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-2xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="size-3" /> Connected
                    </span>
                    {details?.accountEmail && (
                      <span className="font-mono text-3xs text-on-surface-variant leading-normal">
                        {details.accountName
                          ? `${details.accountName} (${details.accountEmail})`
                          : details.accountEmail}
                      </span>
                    )}
                    <Button
                      variant="text"
                      size="sm"
                      loading={isDisconnecting}
                      onClick={() => void handleDisconnect(item.provider)}
                      className="text-3xs font-semibold !text-error hover:underline p-0 justify-start h-auto"
                    >
                      Disconnect account
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    loading={isConnecting}
                    onClick={() => void handleConnect(item.provider)}
                    className="w-full text-2xs font-bold !rounded-xl shadow-sm"
                  >
                    Connect {item.title}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {INTEGRATIONS.map((item, idx) => {
        const isConnected = !!connections?.[item.id];
        const detailsKey = `${item.id}Details` as const;
        const details = connections?.[detailsKey] as { accountEmail?: string | null; accountName?: string | null } | undefined;
        const isConnecting = getConnectUrlMutation.isPending && getConnectUrlMutation.variables?.provider === item.provider;
        const isDisconnecting = disconnectMutation.isPending && disconnectMutation.variables?.provider === item.provider;
        const isLast = idx === INTEGRATIONS.length - 1;

        return (
          <div
            key={item.id}
            className={`border-outline-variant/20 flex flex-col justify-between gap-4 py-5 sm:flex-row sm:items-center ${
              !isLast ? "border-b" : ""
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="bg-surface-container border-outline-variant grid size-9 place-items-center rounded-xl border p-2 shadow-sm">
                <item.Icon className="size-full" />
              </div>
              <div>
                <p className="text-on-surface text-sm font-semibold">{item.title}</p>
                <p className="text-on-surface-variant mt-0.5 text-xs">
                  {item.settingsDesc}
                </p>
                {isConnected && details?.accountEmail && (
                  <p className="mt-1 font-mono text-[10px] font-medium text-primary">
                    {details.accountName
                      ? `${details.accountName} (${details.accountEmail})`
                      : details.accountEmail}
                  </p>
                )}
              </div>
            </div>
            <div className="flex w-full shrink-0 items-center justify-between gap-3 sm:w-auto sm:justify-end">
              {isConnected ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3" />
                  Connected
                </span>
              ) : (
                <span className="bg-surface-container text-on-surface-variant border-outline-variant inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold">
                  <AlertCircle className="size-3" />
                  Not connected
                </span>
              )}
              {isConnected ? (
                <Button
                  variant="error"
                  size="sm"
                  loading={isDisconnecting}
                  onClick={() => void handleDisconnect(item.provider)}
                  className="rounded-lg !px-3 !py-1.5 text-xs"
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  loading={isConnecting}
                  onClick={() => void handleConnect(item.provider)}
                  className="rounded-lg !px-3 !py-1.5 text-xs"
                >
                  Connect
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
