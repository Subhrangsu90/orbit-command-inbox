import { type Metadata } from "next";
import { Suspense } from "react";
import { RefreshCw } from "lucide-react";
import { WorkspaceLayout } from "~/app/_components/WorkspaceLayout";
import { MailDetailClient } from "./MailDetailClient";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Email Details",
    description: "Read and manage email conversation details.",
  };
}

type Mailbox = "inbox" | "starred" | "sent" | "drafts";

function normalizeMailbox(value: string | undefined): Mailbox {
  return value === "starred" ||
    value === "sent" ||
    value === "drafts" ||
    value === "inbox"
    ? value
    : "inbox";
}

export default async function MailDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mailbox?: string; draftId?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const mailbox = normalizeMailbox(query.mailbox);

  return (
    <Suspense
      fallback={
        <WorkspaceLayout wide>
          <div className="flex h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="text-primary size-7 animate-spin" />
              <p className="text-on-surface-variant text-xs font-semibold">
                Loading email...
              </p>
            </div>
          </div>
        </WorkspaceLayout>
      }
    >
      <MailDetailClient
        id={decodeURIComponent(id)}
        mailbox={mailbox}
        draftId={query.draftId}
      />
    </Suspense>
  );
}
