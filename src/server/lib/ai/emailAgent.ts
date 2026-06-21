import { createGeminiChatClient, createOpenAIChatClient, type ChatModelClient } from "~/server/api/llm";
import { retryWithBackoff } from "~/server/lib/retry";

/**
 * Robust completion helper that tries OpenAI and Gemini sequentially.
 * If one fails (e.g. rate limit, quota, invalid key), it falls back to the other.
 */
async function getCompletion(prompt: string): Promise<string> {
  // Order: OpenAI first (verified working), then Gemini as fallback
  const clients: ChatModelClient[] = [];
  
  const openai = createOpenAIChatClient();
  if (openai) clients.push(openai);
  
  const gemini = createGeminiChatClient();
  if (gemini) clients.push(gemini);

  if (clients.length === 0) {
    throw new Error("No LLM clients are configured.");
  }

  let lastError: any = null;
  for (const llm of clients) {
    try {
      const completion = await retryWithBackoff(() =>
        llm.client.chat.completions.create({
          model: llm.model,
          messages: [{ role: "user", content: prompt }],
        })
      );
      const content = completion.choices[0]?.message?.content?.trim();
      if (content) {
        return content;
      }
    } catch (err: any) {
      console.warn(`[LLM Fallback] Provider ${llm.provider} (${llm.model}) failed:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error("Failed to generate completion from all configured LLMs.");
}

export async function getEmailSummary(
  emailId: string,
  subject: string,
  bodyText: string
): Promise<string> {
  try {
    const prompt = `You are a helpful AI assistant. Read this email and summarize it in 2 or 3 bullet points. Focus on key information, decisions, and action items. Keep it short, professional, and clear. Do not use markdown headers (like # or ##), only simple bullet points.

Subject: ${subject}
Content:
${bodyText.slice(0, 4000)}
`;

    const summary = await getCompletion(prompt);
    return summary || "No summary generated.";
  } catch (error) {
    console.error("Failed to generate summary via LLM:", error);
    return "Error generating email summary.";
  }
}

export async function generateEmailReply(
  subject: string,
  senderName: string,
  senderEmail: string,
  emailBody: string,
  tone: "agree" | "decline" | "info" | "custom",
  customPrompt?: string
): Promise<string> {
  let directive = "";
  if (tone === "agree") {
    directive = "Write a polite reply agreeing to the request or invitation in the email.";
  } else if (tone === "decline") {
    directive = "Write a polite, professional reply declining the request, meeting, or offer in the email.";
  } else if (tone === "info") {
    directive = "Write a polite reply asking for more details, clarification, or information.";
  } else {
    directive = `Write a reply following these instructions: ${customPrompt || "Reply professionally."}`;
  }

  try {
    const prompt = `You are an expert executive assistant. Help draft a natural, professional, and context-aware email reply.
Write the email body ONLY. Do not write a subject line. Do not write placeholder text like "[Your Name]". If you need to sign off, sign off naturally or leave a space for a signature. Keep it conversational but professional.

Directive: ${directive}

Original Email details:
- From: ${senderName} <${senderEmail}>
- Subject: ${subject}
- Content:
${emailBody.slice(0, 3500)}
`;

    const reply = await getCompletion(prompt);
    return reply || "";
  } catch (error) {
    console.error("Failed to generate AI reply via LLM:", error);
    throw new Error("Failed to generate AI reply.");
  }
}
