import "dotenv/config";
import postgres from "postgres";
import { env } from "~/env";

async function main() {
  console.log("Connecting to:", env.DATABASE_URL);
  const sql = postgres(env.DATABASE_URL);

  try {
    console.log("Enabling pgvector extension on Neon...");
    await sql`CREATE EXTE
    NSION IF NOT EXISTS vector;`;
    console.log("pgvector extension enabled successfully!");
  } catch (err) {
    console.error("Failed to enable pgvector extension:", err);
  } finally {
    await sql.end();
  }
}

main().catch(console.error);
