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
