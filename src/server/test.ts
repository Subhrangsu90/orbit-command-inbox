import "dotenv/config";
import { db } from "./db/index.js";
import { corsairIntegrations, corsairAccounts } from "./db/schema/corsair.js";

async function main() {
  const integrations = await db.select().from(corsairIntegrations);
  console.log("Integrations:", integrations);

  const accounts = await db.select().from(corsairAccounts);
  console.log("Accounts:", accounts);
}

main().catch(console.error).finally(() => process.exit());
