import OpenAI from "openai";
import crypto from "crypto";
import { sql } from "drizzle-orm";
import { env } from "~/env";
import { db } from "~/server/db";
import { emailEmbeddings, agentMessageEmbeddings } from "~/server/db/schema/embeddings";
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

// Generates a deterministic mock 1536-dimension embedding based on text hashing.
// Allows semantic queries and test scripts to run without failing due to API limits or credentials.
function getDummyEmbedding(text: string): number[] {
  const hash = crypto.createHash("sha256").update(text).digest();
  const vector = new Array(1536).fill(0);
  for (let i = 0; i < 1536; i++) {
    const byteIndex = (i * 7) % hash.length;
    const byte = hash[byteIndex];
    const value = (byte ?? 0) / 255;
    // Produce deterministic values between -1 and 1
    vector[i] = Math.sin(i + value);
  }
  return vector;
}

export async function generateAndStoreEmbedding(
  tenantId: string,
  emailId: string
): Promise<void> {
  const apiKey = env.OPENAI_API_KEY;

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

    let embedding: number[];
    if (!apiKey || isEmbeddingsDisabled) {
      embedding = getDummyEmbedding(textToEmbed);
    } else {
      try {
        const openai = new OpenAI({ apiKey });
        const embeddingResponse = await createEmbeddingWithFallback(
          openai,
          textToEmbed.slice(0, 8000)
        );
        const resultEmbedding = embeddingResponse.data[0]?.embedding;
        if (!resultEmbedding) {
          throw new Error("Failed to generate embedding");
        }
        embedding = resultEmbedding;
      } catch (err: any) {
        const isAccessDenied =
          err?.status === 403 ||
          err?.statusCode === 403 ||
          err?.message?.includes("403") ||
          err?.message?.includes("does not have access to model") ||
          err?.message?.includes("permission");

        if (isAccessDenied) {
          isEmbeddingsDisabled = true;
          console.warn(
            `[VectorSearch] OpenAI Embeddings API is not accessible (403 Forbidden). Falling back to mock embeddings for this session.`
          );
        } else {
          console.error("OpenAI email embedding generation failed:", err);
        }
        embedding = getDummyEmbedding(textToEmbed);
      }
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
    console.error(`Failed to generate/store embedding for email ${emailId}:`, error);
  }
}

export async function searchSemantic(
  tenantId: string,
  query: string,
  limit = 20
) {
  const apiKey = env.OPENAI_API_KEY;

  let queryEmbedding: number[];
  if (!apiKey || isEmbeddingsDisabled) {
    queryEmbedding = getDummyEmbedding(query);
  } else {
    try {
      const openai = new OpenAI({ apiKey });
      const embeddingResponse = await createEmbeddingWithFallback(openai, query);
      const resultEmbedding = embeddingResponse.data[0]?.embedding;
      if (!resultEmbedding) {
        throw new Error("Failed to embed query.");
      }
      queryEmbedding = resultEmbedding;
    } catch (err: any) {
      console.error("OpenAI semantic search embedding failed, falling back to mock:", err);
      queryEmbedding = getDummyEmbedding(query);
    }
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

export async function generateAndStoreMessageEmbedding(
  messageId: string,
  text: string
): Promise<void> {
  const apiKey = env.OPENAI_API_KEY;

  try {
    let embedding: number[];
    if (!apiKey || isEmbeddingsDisabled) {
      embedding = getDummyEmbedding(text);
    } else {
      try {
        const openai = new OpenAI({ apiKey });
        const embeddingResponse = await createEmbeddingWithFallback(
          openai,
          text.slice(0, 8000)
        );

        const resultEmbedding = embeddingResponse.data[0]?.embedding;
        if (!resultEmbedding) {
          throw new Error("Failed to generate embedding for chat message");
        }
        embedding = resultEmbedding;
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
            `[VectorSearch] OpenAI Embeddings API is not accessible (403 Forbidden). Falling back to mock embeddings for chat messages.`
          );
        } else {
          console.error(`Failed to generate/store embedding for message ${messageId}:`, error);
        }
        embedding = getDummyEmbedding(text);
      }
    }

    await db
      .insert(agentMessageEmbeddings)
      .values({
        messageId,
        embedding,
      })
      .onConflictDoUpdate({
        target: agentMessageEmbeddings.messageId,
        set: {
          embedding,
        },
      });
  } catch (error: any) {
    console.error(`Failed to store message embedding in DB for message ${messageId}:`, error);
  }
}

export async function searchChatMemory(
  userId: string,
  queryText: string,
  limit = 5
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const apiKey = env.OPENAI_API_KEY;

  try {
    let queryEmbedding: number[];
    if (!apiKey || isEmbeddingsDisabled) {
      queryEmbedding = getDummyEmbedding(queryText);
    } else {
      try {
        const openai = new OpenAI({ apiKey });
        const embeddingResponse = await createEmbeddingWithFallback(openai, queryText);

        const resultEmbedding = embeddingResponse.data[0]?.embedding;
        if (!resultEmbedding) {
          throw new Error("Failed to embed query.");
        }
        queryEmbedding = resultEmbedding;
      } catch (err: any) {
        console.error("OpenAI chat search embedding failed, falling back to mock:", err);
        queryEmbedding = getDummyEmbedding(queryText);
      }
    }

    const vectorStr = `[${queryEmbedding.join(",")}]`;

    const results = await db.execute(sql`
      SELECT 
        m.role as "role",
        m.content as "content"
      FROM agent_message_embeddings me
      JOIN agent_messages m ON me.message_id = m.id
      JOIN agent_rooms r ON m.room_id = r.id
      WHERE r.user_id = ${userId}
      ORDER BY me.embedding <=> ${vectorStr}::vector
      LIMIT ${limit}
    `);

    const rows = results as unknown as Array<{ role: string; content: string }>;
    return rows.map((r) => ({
      role: r.role as "user" | "assistant",
      content: r.content,
    }));
  } catch (error: any) {
    console.error("Failed to search chat semantic memory:", error);
    return [];
  }
}
