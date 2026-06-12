import { z } from "zod";
import { eq } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { user, account } from "~/server/db/schema/auth";

export const preferencesRouter = createTRPCRouter({
  get: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) {
      return {
        themeMode: "system" as const,
        textScale: "comfortable" as const,
        onboarded: false,
        provider: null,
      };
    }

    const [userData, userAccount] = await Promise.all([
      ctx.db.query.user.findFirst({
        where: eq(user.id, ctx.session.user.id),
        columns: {
          themeMode: true,
          textScale: true,
          onboarded: true,
        },
      }),
      ctx.db.query.account.findFirst({
        where: eq(account.userId, ctx.session.user.id),
        columns: {
          providerId: true,
        },
      }),
    ]);

    return {
      themeMode: (userData?.themeMode ?? "system") as "light" | "dark" | "system",
      textScale: (userData?.textScale ?? "comfortable") as "compact" | "comfortable" | "large",
      onboarded: userData?.onboarded ?? false,
      provider: userAccount?.providerId ?? "credential",
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

  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(user)
      .set({
        onboarded: true,
        updatedAt: new Date(),
      })
      .where(eq(user.id, ctx.session.user.id));

    return { success: true };
  }),
});
