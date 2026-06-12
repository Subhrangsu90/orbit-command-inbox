import { z } from "zod";
import { eq } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { user } from "~/server/db/schema/auth";

export const preferencesRouter = createTRPCRouter({
  get: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) {
      return {
        themeMode: "system" as const,
        textScale: "comfortable" as const,
      };
    }

    const userData = await ctx.db.query.user.findFirst({
      where: eq(user.id, ctx.session.user.id),
      columns: {
        themeMode: true,
        textScale: true,
      },
    });

    return {
      themeMode: (userData?.themeMode ?? "system") as "light" | "dark" | "system",
      textScale: (userData?.textScale ?? "comfortable") as "compact" | "comfortable" | "large",
    };
  }),

  update: protectedProcedure
    .input(
      z.object({
        themeMode: z.enum(["light", "dark", "system"]),
        textScale: z.enum(["compact", "comfortable", "large"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(user)
        .set({
          themeMode: input.themeMode,
          textScale: input.textScale,
          updatedAt: new Date(),
        })
        .where(eq(user.id, ctx.session.user.id));

      return {
        themeMode: input.themeMode,
        textScale: input.textScale,
      };
    }),
});
