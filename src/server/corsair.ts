import "dotenv/config";
import { createCorsair, setupCorsair } from "corsair";
import { conn } from "./db";
import { env } from "~/env";
import { allCorsairPlugins, allCorsairCredentials } from "./integrations/plugins";

export const corsair = createCorsair({
  plugins: allCorsairPlugins(),
  database: conn,
  kek: env.CORSAIR_KEK,
  multiTenancy: true,
});

let setupPromise: Promise<void> | undefined;

export function ensureCorsairConfigured() {
  setupPromise ??= setupCorsair(corsair, {
    credentials: allCorsairCredentials(env),
  }).then(() => undefined);

  return setupPromise;
}
