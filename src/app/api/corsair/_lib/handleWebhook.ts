import { processWebhook } from "corsair";
import { decodePubSubMessage } from "@corsair-dev/gmail";
import { and, eq } from "drizzle-orm";
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
      and(eq(corsairIntegrations.name, "gmail"), eq(user.email, emailAddress)),
    )
    .limit(2);

  if (matches.length === 1) return matches[0]?.tenantId ?? null;
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

  const tenantId =
    url.searchParams.get("tenantId") ??
    env.CORSAIR_WEBHOOK_TENANT_ID ??
    (await resolveTenantFromEmail(
      getPushNotification(body as PubSubBody)?.emailAddress ?? "",
    ));

  if (!tenantId) {
    const pubSubBody = body as PubSubBody;
    const notification = getPushNotification(pubSubBody);
    console.warn("[gmail.messageChanged] ignored unmapped notification", {
      emailAddress: notification?.emailAddress,
      historyId: notification?.historyId,
      messageId: pubSubBody.message?.messageId,
      subscription: pubSubBody.subscription,
    });

    // Acknowledge valid Pub/Sub deliveries so stale watches do not retry forever.
    if (notification?.emailAddress && notification.historyId) {
      return Response.json({ success: true, ignored: true });
    }

    return Response.json(
      {
        success: false,
        error:
          "Unable to resolve the Gmail webhook tenant. Ensure the Pub/Sub emailAddress matches a Gmail-connected Better Auth user, add ?tenantId=<user-id>, or configure CORSAIR_WEBHOOK_TENANT_ID.",
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
