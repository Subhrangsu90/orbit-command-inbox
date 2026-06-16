import { createGeminiChatClient } from "~/server/api/llm";
import { db } from "~/server/db";
import { emailPriorities } from "~/server/db/schema/priorities";
import { eq } from "drizzle-orm";

export type PriorityResult = {
  priority: "high" | "medium" | "low";
  reason: string;
};

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit =
      error?.status === 429 ||
      error?.statusCode === 429 ||
      error?.message?.includes("429") ||
      error?.message?.includes("rate limit") ||
      error?.message?.includes("Quota exceeded");

    if (retries > 0 && isRateLimit) {
      const jitter = Math.random() * 200;
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function classifyAndStorePriority(
  emailId: string,
  subject: string,
  snippet: string
): Promise<PriorityResult> {
  // Check if priority already exists to avoid redundant Gemini classification calls
  try {
    const [existing] = await db
      .select()
      .from(emailPriorities)
      .where(eq(emailPriorities.emailId, emailId))
      .limit(1);

    if (existing) {
      return {
        priority: existing.priority as "high" | "medium" | "low",
        reason: existing.reason ?? "",
      };
    }
  } catch (error) {
    console.error(`Error checking existing priority for email ${emailId}:`, error);
  }

  const llm = createGeminiChatClient();

  if (!llm) {
    const fallback: PriorityResult = {
      priority: "medium",
      reason: "Gemini API key is missing, defaulted to medium.",
    };
    await storePriority(emailId, fallback);
    return fallback;
  }

  try {
    const prompt = `You are an expert email classifier. Classify the following email into one of three priority levels:
- high: Urgent requests, direct action items for the recipient, calendar/meeting invitations, or high-value personal updates.
- medium: Routine updates, newsletters that the user subscribed to, normal conversations/replies, or non-urgent queries.
- low: Automated notifications (billing, systems), receipts, promotional spam, social notifications, or general automated junk.

Email Subject: "${subject}"
Email Snippet: "${snippet}"

Respond ONLY with a JSON object in this format:
{
  "priority": "high" | "medium" | "low",
  "reason": "a short one-sentence explanation"
}`;

    const completion = await retryWithBackoff(() =>
      llm.client.chat.completions.create({
        model: llm.model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      })
    );

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error(`Empty response from ${llm.provider}`);
    }

    const result = JSON.parse(content) as PriorityResult;
    if (!["high", "medium", "low"].includes(result.priority)) {
      result.priority = "medium";
    }

    await storePriority(emailId, result);
    return result;
  } catch (error) {
    console.error(`Error classifying email priority via Gemini (${llm.model}) for ${emailId}:`, error);
    const fallback: PriorityResult = {
      priority: "medium",
      reason: "Error during Gemini classification, defaulted to medium.",
    };
    await storePriority(emailId, fallback);
    return fallback;
  }
}

async function storePriority(emailId: string, result: PriorityResult) {
  try {
    await db
      .insert(emailPriorities)
      .values({
        emailId,
        priority: result.priority,
        reason: result.reason,
      })
      .onConflictDoUpdate({
        target: emailPriorities.emailId,
        set: {
          priority: result.priority,
          reason: result.reason,
        },
      });
  } catch (error) {
    console.error(`Error writing priority to database for email ${emailId}:`, error);
  }
}
