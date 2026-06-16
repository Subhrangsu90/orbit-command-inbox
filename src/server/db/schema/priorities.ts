import { pgTable, text } from "drizzle-orm/pg-core";

export const emailPriorities = pgTable("email_priorities", {
  emailId: text("email_id").primaryKey(),
  priority: text("priority").notNull(), // 'high' | 'medium' | 'low'
  reason: text("reason"),
});
