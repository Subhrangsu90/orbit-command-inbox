import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { preferencesRouter } from "~/server/api/routers/preferences";
import { corsairRouter } from "~/server/api/routers/corsair";
import { integrationsRouter } from "~/server/api/routers/integrations";
import { emailsRouter } from "~/server/api/routers/emails";
import { calendarRouter } from "~/server/api/routers/calendar";
import { agentRouter } from "~/server/api/routers/agent";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  preferences: preferencesRouter,
  corsair: corsairRouter,
  integrations: integrationsRouter,
  emails: emailsRouter,
  calendar: calendarRouter,
  agent: agentRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.hello.greet({ text: "from tRPC" });
 *       ^? { greeting: string }
 */
export const createCaller = createCallerFactory(appRouter);
