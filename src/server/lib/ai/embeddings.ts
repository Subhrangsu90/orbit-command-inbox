import OpenAI from "openai";
import crypto from "crypto";
import { sql } from "drizzle-orm";
import { env } from "~/env";
import { db } from "~/server/db";
import { emailEmbeddings } from "~/server/db/schema/embeddings";
import { emailsService } from "~/server/api/routers/emails/service";
import { eq } from "drizzle-orm";
import { retryWithBackoff } from "~/server/lib/retry";

async function createEmbeddingWithFallback(
  openai: OpenAI,
  text: string
) {
  try {
    return await retryWithBackoff(() =>
      openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      })
    );
  } catch (error: any) {
    const isAccessDenied =
      error?.status === 403 ||
      error?.statusCode === 403 ||
      error?.message?.includes("403") ||
      error?.message?.includes("does not have access to model") ||
      error?.message?.includes("not allowed") ||
      error?.message?.includes("permission");

    if (isAccessDenied) {
      console.warn("Access denied for text-embedding-3-small. Falling back to text-embedding-ada-002.");
      return await retryWithBackoff(() =>
        openai.embeddings.create({
          model: "text-embedding-ada-002",
          input: text,
        })
      );
    }
    throw error;
  }
}

let isEmbeddingsDisabled = false;

export async function generateAndStoreEmbedding(
  tenantId: string,
  emailId: string
): Promise<void> {
  if (isEmbeddingsDisabled) return;
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) return;

  try {
    const email = await emailsService.get(tenantId, { id: emailId });
    const textToEmbed = `Subject: ${email.subject}\nFrom: ${email.from}\nTo: ${email.to}\nSnippet: ${email.snippet}\nBody:\n${email.body}`;
    const contentHash = crypto.createHash("sha256").update(textToEmbed).digest("hex");

    // Check if embedding exists and content hasn't changed
    const [existing] = await db
      .select()
      .from(emailEmbeddings)
      .where(eq(emailEmbeddings.emailId, emailId))
      .limit(1);

    if (existing && existing.contentHash === contentHash) {
      return; // Already matches
    }

    const openai = new OpenAI({ apiKey });
    const embeddingResponse = await createEmbeddingWithFallback(
      openai,
      textToEmbed.slice(0, 8000)
    );

    const embedding = embeddingResponse.data[0]?.embedding;
    if (!embedding) {
      throw new Error("Failed to generate embedding");
    }

    await db
      .insert(emailEmbeddings)
      .values({
        emailId,
        embedding,
        contentHash,
      })
      .onConflictDoUpdate({
        target: emailEmbeddings.emailId,
        set: {
          embedding,
          contentHash,
        },
      });
  } catch (error: any) {
    const isAccessDenied =
      error?.status === 403 ||
      error?.statusCode === 403 ||
      error?.message?.includes("403") ||
      error?.message?.includes("does not have access to model") ||
      error?.message?.includes("permission");

    if (isAccessDenied) {
      isEmbeddingsDisabled = true;
      console.warn(
        `[VectorSearch] OpenAI Embeddings API is not accessible (403 Forbidden). Disabling semantic search embeddings for this session. Details: ${error?.message || error}`
      );
    } else {
      console.error(`Failed to generate/store embedding for email ${emailId}:`, error);
    }
  }
}

export async function searchSemantic(
  tenantId: string,
  query: string,
  limit = 20
) {
  if (isEmbeddingsDisabled) {
    throw new Error("Semantic search is disabled because the OpenAI Embeddings API is not accessible (403 Forbidden).");
  }
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key is required for semantic search.");
  }

  const openai = new OpenAI({ apiKey });
  const embeddingResponse = await createEmbeddingWithFallback(openai, query);

  const queryEmbedding = embeddingResponse.data[0]?.embedding;
  if (!queryEmbedding) {
    throw new Error("Failed to embed query.");
  }

  // Query using raw SQL bindings for pgvector <=> (cosine distance)
  // Cosine similarity is 1 - (embedding <=> queryEmbedding)
  const vectorStr = `[${queryEmbedding.join(",")}]`;
  
  const results = await db.execute(sql`
    SELECT email_id as "emailId", 1 - (embedding <=> ${vectorStr}::vector) as similarity
    FROM email_embeddings
    ORDER BY embedding <=> ${vectorStr}::vector
    LIMIT ${limit}
  `);

  const rows = results as unknown as Array<{ emailId: string; similarity: number }>;
  const emailIds = rows.map((r) => r.emailId);

  if (emailIds.length === 0) {
    return { messages: [] };
  }

  // Fetch full details of the emails from Gmail/Local cache
  const messages = await Promise.all(
    emailIds.map(async (id) => {
      try {
        return await emailsService.get(tenantId, { id });
      } catch (err) {
        console.warn(`Failed to fetch semantic match ${id}:`, err);
        return null;
      }
    })
  );

  return {
    messages: messages.filter((m): m is NonNullable<typeof m> => m !== null),
  };
}
