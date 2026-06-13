import { eq } from "drizzle-orm";
import { user, account } from "~/server/db/schema/auth";

export const preferencesService = {
    async get(db: any, userId?: string) {
        if (!userId) {
            return {
                themeMode: "system" as const,
                textScale: "comfortable" as const,
                onboarded: false,
                provider: null,
            };
        }

        const [userData, userAccount] = await Promise.all([
            db.query.user.findFirst({
                where: eq(user.id, userId),
                columns: {
                    themeMode: true,
                    textScale: true,
                    onboarded: true,
                },
            }),
            db.query.account.findFirst({
                where: eq(account.userId, userId),
                columns: {
                    providerId: true,
                },
            }),
        ]);

        return {
            themeMode: userData?.themeMode ?? "system",
            textScale: userData?.textScale ?? "comfortable",
            onboarded: userData?.onboarded ?? false,
            provider: userAccount?.providerId ?? "credential",
        };
    },

    async update(
        db: any,
        userId: string,
        input: {
            themeMode: "light" | "dark" | "system";
            textScale: "compact" | "comfortable" | "large";
        },
    ) {
        await db
            .update(user)
            .set({
                themeMode: input.themeMode,
                textScale: input.textScale,
                updatedAt: new Date(),
            })
            .where(eq(user.id, userId));

        return input;
    },

    async completeOnboarding(db: any, userId: string) {
        await db
            .update(user)
            .set({
                onboarded: true,
                updatedAt: new Date(),
            })
            .where(eq(user.id, userId));

        return { success: true };
    },
};