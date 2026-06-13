import { z } from "zod";

export const getPreferencesOutputModel = z.object({
    themeMode: z.enum(["light", "dark", "system"]).describe("The preferred color theme of the application interface"),
    textScale: z.enum(["compact", "comfortable", "large"]).describe("The scaling level of the application text layout"),
    onboarded: z.boolean().describe("Whether the user has completed the onboarding flow"),
    provider: z.string().nullable().describe("The auth provider type used by the user account"),
});

export const updatePreferencesInputModel = z.object({
    themeMode: z.enum(["light", "dark", "system"]).describe("The color theme to set"),
    textScale: z.enum(["compact", "comfortable", "large"]).describe("The text scale to set"),
});

export const updatePreferencesOutputModel = updatePreferencesInputModel;

export const completeOnboardingOutputModel = z.object({
    success: z.boolean().describe("Indicates if the onboarding completion flag was set successfully"),
});