import { pgTable, text, vector, timestamp } from "drizzle-orm/pg-core";

export const emailEmbeddings = pgTable("email_embeddings", {
  emailId: text("email_id").primaryKey(),
  embedding: vector("embedding", { dimensions: 1536 }).notNull(),
  contentHash: text("content_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
