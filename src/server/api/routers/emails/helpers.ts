import type { MessagePart } from "@corsair-dev/gmail";
import { corsair } from "~/server/corsair";

export type GmailHeader = { name?: string; value?: string };

export function getHeader(headers: GmailHeader[] | undefined, name: string) {
  return (
    headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())
      ?.value ?? ""
  );
}

export function decodeMimeHeader(value: string) {
  return value.replace(
    /=\?([^?]+)\?([bq])\?([^?]*)\?=/gi,
    (_match, charset: string, encoding: string, content: string) => {
      try {
        if (encoding.toLowerCase() === "b") {
          return Buffer.from(content, "base64").toString(
            charset.toLowerCase() === "iso-8859-1" ? "latin1" : "utf8",
          );
        }

        const quotedPrintable = content
          .replace(/_/g, " ")
          .replace(/=([0-9a-f]{2})/gi, "%$1");
        return decodeURIComponent(quotedPrintable);
      } catch {
        return content;
      }
    },
  );
}

export function parseMailbox(value: string) {
  const decoded = decodeMimeHeader(value).trim();
  const email = extractEmailAddress(decoded);
  const name = decoded
    .replace(/<[^>]+>/g, "")
    .replace(/^['"]|['"]$/g, "")
    .trim();

  return {
    value: decoded,
    name: name || email || "Unknown sender",
    email,
  };
}

export function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

export function sanitizeEmailHtml(value: string) {
  return value
    .replace(
      /<\s*(script|iframe|object|embed|form|base|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
      "",
    )
    .replace(/<\s*(script|iframe|object|embed|form|base|meta)\b[^>]*\/?>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '$1="#"');
}

export function looksLikeMarkdown(value: string) {
  return /(^|\n)(#{1,3}\s|[-*]\s|>\s|```)|\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\//.test(
    value,
  );
}

export function findBody(
  part: MessagePart | undefined,
  mimeType: "text/plain" | "text/html",
): string {
  if (!part) return "";
  if (part.mimeType === mimeType && part.body?.data)
    return decodeBase64Url(part.body.data);

  for (const child of part.parts ?? []) {
    const body = findBody(child, mimeType);
    if (body) return body;
  }

  return "";
}

export function getMessageContent(payload: MessagePart | undefined) {
  const html = findBody(payload, "text/html");
  if (html)
    return { body: sanitizeEmailHtml(html), contentType: "html" as const };

  const text = findBody(payload, "text/plain");
  if (text) {
    const content = text.trim();
    return {
      body: content,
      contentType: looksLikeMarkdown(content)
        ? ("markdown" as const)
        : ("text" as const),
    };
  }

  return { body: "", contentType: "text" as const };
}

export function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

export function encodeSubject(value: string) {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

export function singleLine(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function formatInternalDate(value: string | number | Date | null | undefined) {
  if (!value) return "";
  const normalized =
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function extractEmailAddress(value: string) {
  const angleAddress = value.match(/<([^<>\s]+@[^<>\s]+)>/i)?.[1];
  if (angleAddress) return angleAddress;
  return (
    value.match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ??
    ""
  );
}

export function createMimeMessage(input: {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
}) {
  const headers = [
    `To: ${singleLine(input.to)}`,
    `Subject: ${encodeSubject(singleLine(input.subject))}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
  ];

  if (input.inReplyTo)
    headers.push(`In-Reply-To: ${singleLine(input.inReplyTo)}`);
  if (input.references)
    headers.push(`References: ${singleLine(input.references)}`);

  return toBase64Url([...headers, "", input.body].join("\r\n"));
}

export function isNotConnectedError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return [
    "account not found",
    "auth-missing",
    "credentials",
    "refresh token",
    "token",
  ].some((value) => message.includes(value));
}

export function isRateLimitError(error: unknown) {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status)
      : undefined;
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const value = String(error).toLowerCase();

  return (
    status === 429 ||
    status === 403 ||
    message.includes("too many requests") ||
    message.includes("quota exceeded") ||
    message.includes("rate limit") ||
    value.includes("too many requests") ||
    value.includes("quota exceeded") ||
    value.includes("rate limit")
  );
}

export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000,
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && isRateLimitError(error)) {
      console.warn(
        `[Gmail API] Rate limit or quota hit. Retrying in ${delayMs}ms... (Retries left: ${retries})`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return fetchWithRetry(fn, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

export const FALLBACK_GMAIL_LABELS = [
  { id: "INBOX", name: "Inbox", type: "system" as const },
  { id: "STARRED", name: "Starred", type: "system" as const },
  { id: "SENT", name: "Sent", type: "system" as const },
  { id: "DRAFT", name: "Drafts", type: "system" as const },
  { id: "TRASH", name: "Trash", type: "system" as const },
  { id: "UNREAD", name: "Unread", type: "system" as const },
];

export type GmailMessage = Awaited<
  ReturnType<
    ReturnType<typeof corsair.withTenant>["gmail"]["api"]["messages"]["get"]
  >
>;

export function normalizeMessage(detail: GmailMessage, fallbackId = "") {
  const headers = detail.payload?.headers;
  const sender = parseMailbox(getHeader(headers, "From"));
  const recipient = parseMailbox(getHeader(headers, "To"));
  const content = getMessageContent(detail.payload);

  return {
    id: detail.id ?? fallbackId,
    threadId: detail.threadId ?? "",
    snippet: detail.snippet ?? "",
    labelIds: detail.labelIds ?? [],
    internalDate: formatInternalDate(detail.internalDate),
    subject: decodeMimeHeader(getHeader(headers, "Subject")) || "(No subject)",
    from: sender.value,
    senderName: sender.name,
    senderEmail: sender.email,
    to: recipient.value,
    recipientName: recipient.name,
    recipientEmail: recipient.email,
    date: getHeader(headers, "Date"),
    messageId: getHeader(headers, "Message-ID"),
    replyTo: getHeader(headers, "Reply-To"),
    body: content.body || detail.snippet || "",
    contentType: content.body ? content.contentType : ("text" as const),
    isUnread: detail.labelIds?.includes("UNREAD") ?? false,
  };
}
