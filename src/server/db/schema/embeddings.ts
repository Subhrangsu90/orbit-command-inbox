import { pgTable, text, vector, timestamp, index } from "drizzle-orm/pg-core";
import { agentMessages } from "./chats";

export const emailEmbeddings = pgTable("email_embeddings", {
  emailId: text("email_id").primaryKey(),
  embedding: vector("embedding", { dimensions: 1536 }).notNull(),
  contentHash: text("content_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const agentMessageEmbeddings = pgTable("agent_message_embeddings", {
  messageId: text("message_id")
    .primaryKey()
    .references(() => agentMessages.id, { onDelete: "cascade" }),
  embedding: vector("embedding", { dimensions: 1536 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("agent_message_embeddings_hnsw_idx").using(
    "hnsw",
    table.embedding.op("vector_cosine_ops")
  ),
]);

