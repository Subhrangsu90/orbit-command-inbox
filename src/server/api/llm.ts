import OpenAI from "openai";
import { env } from "~/env";

export type ChatModelProvider = "Gemini" | "OpenAI";

export type ChatModelClient = {
  client: OpenAI;
  model: string;
  provider: ChatModelProvider;
};

export function createOpenAIChatClient(): ChatModelClient | null {
  if (!env.OPENAI_API_KEY || !env.OPENAI_CHAT_MODEL) return null;

  return {
    client: new OpenAI({ apiKey: env.OPENAI_API_KEY }),
    model: env.OPENAI_CHAT_MODEL,
    provider: "OpenAI",
  };
}

export function createGeminiChatClient(): ChatModelClient | null {
  if (!env.GEMINI_API_KEY) return null;

  return {
    client: new OpenAI({
      apiKey: env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    }),
    model: env.GEMINI_CHAT_MODEL ?? "gemini-2.5-flash",
    provider: "Gemini",
  };
}
