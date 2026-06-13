import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { preferencesRouter } from "~/server/api/routers/preferences";
import { corsairRouter } from "~/server/api/routers/corsair";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  preferences: preferencesRouter,
  corsair: corsairRouter,
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
