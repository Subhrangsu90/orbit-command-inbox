import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const agentRooms = pgTable("agent_rooms", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow(),
});

export const agentMessages = pgTable("agent_messages", {
  id: text("id").primaryKey(),
  roomId: text("room_id")
    .notNull()
    .references(() => agentRooms.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  actions: jsonb("actions").default([]),
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
});
