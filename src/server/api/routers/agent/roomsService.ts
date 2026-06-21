import { db } from "~/server/db";
import { agentRooms, agentMessages } from "~/server/db/schema/chats";
import { eq, and, desc, asc } from "drizzle-orm";
import { agentService } from "./service";
import { createGeminiChatClient, createOpenAIChatClient } from "~/server/api/llm";
import crypto from "crypto";
import type { Message } from "./model";

export const roomsService = {
  async listRooms(userId: string) {
    return db
      .select()
      .from(agentRooms)
      .where(eq(agentRooms.userId, userId))
      .orderBy(desc(agentRooms.updatedAt));
  },

  async getRoomHistory(roomId: string, userId: string) {
    // Verify room ownership
    const room = await db
      .select()
      .from(agentRooms)
      .where(and(eq(agentRooms.id, roomId), eq(agentRooms.userId, userId)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!room) {
      throw new Error("Chat room not found or access denied");
    }

    const messages = await db
      .select()
      .from(agentMessages)
      .where(eq(agentMessages.roomId, roomId))
      .orderBy(asc(agentMessages.createdAt));

    return messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
      actions: m.actions || [],
      createdAt: m.createdAt,
    }));
  },

  async createRoom(userId: string, title = "New Chat") {
    const id = crypto.randomUUID();
    const now = new Date();
    await db.insert(agentRooms).values({
      id,
      userId,
      title,
      createdAt: now,
      updatedAt: now,
    });
    return { id, title, createdAt: now, updatedAt: now };
  },

  async deleteRoom(roomId: string, userId: string) {
    // Verify room ownership
    const room = await db
      .select()
      .from(agentRooms)
      .where(and(eq(agentRooms.id, roomId), eq(agentRooms.userId, userId)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!room) {
      throw new Error("Chat room not found or access denied");
    }

    await db.delete(agentRooms).where(eq(agentRooms.id, roomId));
    return { success: true };
  },

  async renameRoom(roomId: string, userId: string, title: string) {
    // Verify room ownership
    const room = await db
      .select()
      .from(agentRooms)
      .where(and(eq(agentRooms.id, roomId), eq(agentRooms.userId, userId)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!room) {
      throw new Error("Chat room not found or access denied");
    }

    await db
      .update(agentRooms)
      .set({ title, updatedAt: new Date() })
      .where(eq(agentRooms.id, roomId));

    return { success: true };
  },

  async chatInRoom(roomId: string, userId: string, content: string) {
    // Verify room ownership
    const room = await db
      .select()
      .from(agentRooms)
      .where(and(eq(agentRooms.id, roomId), eq(agentRooms.userId, userId)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!room) {
      throw new Error("Chat room not found or access denied");
    }

    // Save user's message to db
    const userMessageId = crypto.randomUUID();
    const userMessageTime = new Date();
    await db.insert(agentMessages).values({
      id: userMessageId,
      roomId,
      role: "user",
      content,
      createdAt: userMessageTime,
    });

    // Retrieve previous messages
    const history = await db
      .select()
      .from(agentMessages)
      .where(eq(agentMessages.roomId, roomId))
      .orderBy(asc(agentMessages.createdAt));

    // Automatically generate title from first user message
    if (history.length === 1) {
      let newTitle = content.trim();
      const llm = createOpenAIChatClient() ?? createGeminiChatClient();
      if (llm) {
        try {
          const prompt = `You are a chat title generator. Generate a very short (2 to 4 words), concise, and professional title summarizing the following user query. Do NOT use quotes, do NOT explain, and respond ONLY with the title.
Query: "${content.trim()}"`;
          const completion = await llm.client.chat.completions.create({
            model: llm.model,
            messages: [{ role: "user", content: prompt }],
          });
          const generated = completion.choices[0]?.message?.content?.trim();
          if (generated) {
            newTitle = generated.replace(/['"]+/g, '');
            if (newTitle.length > 30) {
              newTitle = newTitle.slice(0, 27) + "...";
            }
          }
        } catch (e) {
          console.error("Failed to generate chat title with LLM, falling back to message content:", e);
          if (newTitle.length > 30) {
            newTitle = newTitle.slice(0, 27) + "...";
          }
        }
      } else {
        if (newTitle.length > 30) {
          newTitle = newTitle.slice(0, 27) + "...";
        }
      }
      await db
        .update(agentRooms)
        .set({ title: newTitle })
        .where(eq(agentRooms.id, roomId));
    }

    const formattedHistory = history.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    // Call agentService
    const agentResult = await agentService.chat(userId, {
      messages: formattedHistory,
    });

    // Save assistant's response to db
    const assistantMessageId = crypto.randomUUID();
    const assistantMessageTime = new Date();
    await db.insert(agentMessages).values({
      id: assistantMessageId,
      roomId,
      role: "assistant",
      content: agentResult.response,
      actions: agentResult.actions,
      createdAt: assistantMessageTime,
    });

    // Update room's updatedAt
    await db
      .update(agentRooms)
      .set({ updatedAt: new Date() })
      .where(eq(agentRooms.id, roomId));

    // Get final history to return
    const finalHistory = await this.getRoomHistory(roomId, userId);

    return {
      response: agentResult.response,
      actions: agentResult.actions,
      messages: finalHistory,
    };
  },
};
