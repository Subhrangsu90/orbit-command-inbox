CREATE TABLE "agent_message_embeddings" (
	"message_id" text PRIMARY KEY NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "agent_message_embeddings" ADD CONSTRAINT "agent_message_embeddings_message_id_agent_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."agent_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_message_embeddings_hnsw_idx" ON "agent_message_embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "agent_messages_room_id_idx" ON "agent_messages" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "agent_rooms_user_id_idx" ON "agent_rooms" USING btree ("user_id");