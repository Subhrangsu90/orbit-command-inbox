import { processWebhook } from "corsair";
import { decodePubSubMessage } from "@corsair-dev/gmail";
import { and, eq, or } from "drizzle-orm";
import { env } from "~/env";
import { corsair, ensureCorsairConfigured } from "~/server/corsair";
import { db } from "~/server/db";
import { corsairAccounts, corsairIntegrations, user } from "~/server/db/schema";

type PubSubBody = {
  message?: {
    data?: string;
    messageId?: string;
  };
  subscription?: string;
};

const WEBHOOK_RATE_LIMIT_WINDOW_MS = 60_000;
const WEBHOOK_RATE_LIMIT_MAX_REQUESTS = 30;
const WEBHOOK_DEDUPE_TTL_MS = 10 * 60_000;

const webhookRequestLog = new Map<string, number[]>();
const processedWebhookMessages = new Map<string, number>();

function pruneWebhookState(now: number) {
  for (const [key, timestamps] of webhookRequestLog) {
    const active = timestamps.filter(
      (timestamp) => now - timestamp < WEBHOOK_RATE_LIMIT_WINDOW_MS,
    );
    if (active.length) {
      webhookRequestLog.set(key, active);
    } else {
      webhookRequestLog.delete(key);
    }
  }

  for (const [key, timestamp] of processedWebhookMessages) {
    if (now - timestamp >= WEBHOOK_DEDUPE_TTL_MS) {
      processedWebhookMessages.delete(key);
    }
  }
}

function getPubSubDedupeKey(body: PubSubBody) {
  const messageId = body.message?.messageId;
  if (!messageId) return null;
  return `${body.subscription ?? "default"}:${messageId}`;
}

function isDuplicateWebhookDelivery(body: PubSubBody, now: number) {
  const key = getPubSubDedupeKey(body);
  if (!key) return false;
  if (processedWebhookMessages.has(key)) return true;
  processedWebhookMessages.set(key, now);
  return false;
}

function isWebhookRateLimited(tenantId: string, now: number) {
  const timestamps = webhookRequestLog.get(tenantId) ?? [];
  const active = timestamps.filter(
    (timestamp) => now - timestamp < WEBHOOK_RATE_LIMIT_WINDOW_MS,
  );

  if (active.length >= WEBHOOK_RATE_LIMIT_MAX_REQUESTS) {
    webhookRequestLog.set(tenantId, active);
    return true;
  }

  webhookRequestLog.set(tenantId, [...active, now]);
  return false;
}

function getPushNotification(body: PubSubBody) {
  if (!body.message?.data) return null;
  try {
    return decodePubSubMessage(body.message.data);
  } catch {
    return null;
  }
}

async function resolveTenantFromEmail(emailAddress: string) {
  if (!emailAddress) return null;

  const matches = await db
    .select({ tenantId: corsairAccounts.tenantId })
    .from(corsairAccounts)
    .innerJoin(
      corsairIntegrations,
      eq(corsairAccounts.integrationId, corsairIntegrations.id),
    )
    .innerJoin(user, eq(corsairAccounts.tenantId, user.id))
    .where(
      and(
        or(
          eq(corsairIntegrations.name, "gmail"),
          eq(corsairIntegrations.name, "googlecalendar"),
        ),
        eq(user.email, emailAddress),
      ),
    );

  const uniqueTenantIds = Array.from(new Set(matches.map((m) => m.tenantId)));
  if (uniqueTenantIds.length === 1) return uniqueTenantIds[0] ?? null;
  return null;
}

export async function handleCorsairWebhook(request: Request) {
  await ensureCorsairConfigured();

  const url = new URL(request.url);
  const headers = Object.fromEntries(request.headers.entries());
  const rawBody = await request.text();
  let body: Record<string, unknown> = {};

  try {
    const parsed: unknown = rawBody ? JSON.parse(rawBody) : {};
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error("Webhook body must be a JSON object.");
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return Response.json(
      { success: false, error: "Webhook body must be valid JSON." },
      { status: 400 },
    );
  }

  const notification = getPushNotification(body as PubSubBody);
  let resolvedEmail = "";
  if (notification) {
    if (typeof (notification as any).emailAddress === "string" && (notification as any).emailAddress) {
      resolvedEmail = (notification as any).emailAddress;
    } else if (typeof (notification as any).resourceUri === "string" && (notification as any).resourceUri) {
      const match = (notification as any).resourceUri.match(/\/calendars\/([^\/\?]+)/);
      if (match?.[1]) {
        resolvedEmail = decodeURIComponent(match[1]);
      }
    }
  }

  if (!resolvedEmail) {
    const resourceUri = headers["x-goog-resource-uri"] || headers["X-Goog-Resource-URI"];
    if (typeof resourceUri === "string" && resourceUri) {
      const match = resourceUri.match(/\/calendars\/([^\/\?]+)/);
      if (match?.[1]) {
        resolvedEmail = decodeURIComponent(match[1]);
      }
    }
  }

  const tenantId =
    url.searchParams.get("tenantId") ??
    env.CORSAIR_WEBHOOK_TENANT_ID ??
    (await resolveTenantFromEmail(resolvedEmail));

  if (!tenantId) {
    const pubSubBody = body as PubSubBody;
    console.warn("[webhook.messageChanged] ignored unmapped notification", {
      resolvedEmail,
      emailAddress: (notification as any)?.emailAddress,
      historyId: (notification as any)?.historyId,
      messageId: pubSubBody.message?.messageId,
      subscription: pubSubBody.subscription,
    });

    // Acknowledge valid Pub/Sub/Webhook deliveries so stale watches do not retry forever.
    if (
      ((notification as any)?.emailAddress && (notification as any).historyId) ||
      resolvedEmail
    ) {
      return Response.json({ success: true, ignored: true });
    }

    return Response.json(
      {
        success: false,
        error:
          "Unable to resolve the webhook tenant. Ensure the Pub/Sub emailAddress or Calendar resourceUri matches a Gmail or Google Calendar connected Better Auth user, add ?tenantId=<user-id>, or configure CORSAIR_WEBHOOK_TENANT_ID.",
      },
      { status: 400 },
    );
  }

  const pubSubBody = body as PubSubBody;
  const now = Date.now();
  pruneWebhookState(now);

  if (isDuplicateWebhookDelivery(pubSubBody, now)) {
    console.info("[webhook.messageChanged] ignored duplicate delivery", {
      tenantId,
      messageId: pubSubBody.message?.messageId,
      subscription: pubSubBody.subscription,
    });
    return Response.json({ success: true, duplicate: true });
  }

  if (isWebhookRateLimited(tenantId, now)) {
    console.warn("[webhook.messageChanged] rate limited delivery", {
      tenantId,
      messageId: pubSubBody.message?.messageId,
      subscription: pubSubBody.subscription,
    });
    return Response.json({ success: true, rateLimited: true });
  }

  const result = await processWebhook(corsair, headers, body, { tenantId });
  if (!result.plugin || !result.action) {
    return Response.json(
      {
        success: false,
        error: "No Corsair webhook matched this request.",
      },
      { status: 422 },
    );
  }

  return Response.json(result.response ?? { success: true });
}
