import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const helloRouter = createTRPCRouter({
  greet: publicProcedure
    .input(z.object({ text: z.string().min(1) }))
    .query(({ input }) => ({
      greeting: `Hello ${input.text}`,
    })),
});
