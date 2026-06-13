import {
    createTRPCRouter,
    protectedProcedure,
    publicProcedure,
} from "~/server/api/trpc";

import { preferencesService } from "./service";
import {
    getPreferencesOutputModel,
    updatePreferencesInputModel,
    updatePreferencesOutputModel,
    completeOnboardingOutputModel,
} from "./model";

const TAGS = ["Preferences"];

export const preferencesRouter = createTRPCRouter({
    get: publicProcedure
        .meta({
            openapi: {
                method: "GET",
                path: "/preferences",
                tags: TAGS,
                summary: "Get user preferences",
                description:
                    "Returns the current user's preferences. If the user is not authenticated, default preferences are returned.",
            },
        })
        .output(getPreferencesOutputModel)
        .query(async ({ ctx }) => {
            return preferencesService.get(ctx.db, ctx.session?.user?.id);
        }),

    update: protectedProcedure
        .meta({
            openapi: {
                method: "PATCH",
                path: "/preferences",
                tags: TAGS,
                summary: "Update user preferences",
                description:
                    "Updates the authenticated user's theme mode and text scale preferences.",
            },
        })
        .input(updatePreferencesInputModel)
        .output(updatePreferencesOutputModel)
        .mutation(async ({ ctx, input }) => {
            return preferencesService.update(ctx.db, ctx.session.user.id, input);
        }),

    completeOnboarding: protectedProcedure
        .meta({
            openapi: {
                method: "POST",
                path: "/preferences/complete-onboarding",
                tags: TAGS,
                summary: "Complete onboarding",
                description:
                    "Marks onboarding as completed for the authenticated user.",
            },
        })
        .output(completeOnboardingOutputModel)
        .mutation(async ({ ctx }) => {
            return preferencesService.completeOnboarding(ctx.db, ctx.session.user.id);
        }),
});