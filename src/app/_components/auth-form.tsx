"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { authClient } from "~/server/better-auth/client";

type AuthMode = "login" | "signup";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      const result = isSignup
        ? await authClient.signUp.email({
            name: String(form.get("name") ?? "").trim(),
            email,
            password,
            callbackURL: "/",
          })
        : await authClient.signIn.email({
            email,
            password,
            callbackURL: "/",
          });

      if (result.error) {
        setError(
          result.error.message ?? "Unable to continue. Please try again.",
        );
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleSocial(provider: "google" | "github") {
    setError(null);
    setIsPending(true);

    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: "/",
      });

      if (result?.error) {
        setError(
          result.error.message ?? `Unable to continue with ${provider}.`,
        );
        setIsPending(false);
      }
    } catch {
      setError(`Unable to continue with ${provider}. Please try again.`);
      setIsPending(false);
    }
  }

  return (
    <div className="w-full max-w-[24rem] py-2">
      <div className="mb-4">
        <p className="text-primary mb-1 text-[10px] font-bold tracking-[0.16em] uppercase">
          {isSignup ? "Start organizing" : "Welcome back"}
        </p>
        <h1 className="text-on-surface font-serif text-2xl font-bold leading-tight">
          {isSignup
            ? "Create your Tacta workspace"
            : "Sign in to Tacta"}
        </h1>
        <p className="text-on-surface-variant mt-1.5 text-xs leading-5">
          {isSignup
            ? "Bring email, calendar, and workflows into one focused place."
            : "Your command center and inbox actions are waiting."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => void handleSocial("google")}
          disabled={isPending}
          className="border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary hover:bg-surface-container-low flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg className="size-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
          </svg>
          Google
        </button>
        <button
          type="button"
          onClick={() => void handleSocial("github")}
          disabled={isPending}
          className="border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary hover:bg-surface-container-low flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg className="size-4 shrink-0 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
          GitHub
        </button>
      </div>

      <div className="text-outline my-4 flex items-center gap-3 text-[10px] font-bold tracking-[0.12em] uppercase opacity-80">
        <span className="bg-outline-variant h-px flex-1" />
        or email
        <span className="bg-outline-variant h-px flex-1" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {isSignup && (
          <label className="block">
            <span className="text-on-surface mb-1 block text-xs font-semibold">
              Full name
            </span>
            <input
              name="name"
              type="text"
              autoComplete="name"
              required
              placeholder="Alex Morgan"
              className="border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-outline/60 focus:border-primary focus:ring-primary-fixed/60 h-10 w-full rounded-xl border px-3 text-xs transition outline-none focus:ring-2"
            />
          </label>
        )}

        <label className="block">
          <span className="text-on-surface mb-1 block text-xs font-semibold">
            Email address
          </span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            className="border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-outline/60 focus:border-primary focus:ring-primary-fixed/60 h-10 w-full rounded-xl border px-3 text-xs transition outline-none focus:ring-2"
          />
        </label>

        <label className="block">
          <span className="text-on-surface mb-1 flex items-center justify-between text-xs font-semibold">
            Password
            {!isSignup && (
              <span className="text-primary font-semibold hover:underline cursor-pointer">Forgot?</span>
            )}
          </span>
          <span className="relative block">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={8}
              placeholder={
                isSignup ? "At least 8 characters" : "Enter password"
              }
              className="border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-outline/60 focus:border-primary focus:ring-primary-fixed/60 h-10 w-full rounded-xl border px-3 pr-10 text-xs transition outline-none focus:ring-2"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="text-outline hover:text-primary absolute inset-y-0 right-0 flex w-10 items-center justify-center transition"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-3.5" />
              ) : (
                <Eye className="size-3.5" />
              )}
            </button>
          </span>
        </label>

        {error && (
          <p
            role="alert"
            className="bg-error-container text-on-error-container rounded-xl px-3 py-2 text-xs"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="bg-primary text-on-primary hover:bg-primary-container flex h-10 w-full items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-65"
        >
          {isPending && <LoaderCircle className="size-3.5 animate-spin" />}
          {isSignup ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="text-on-surface-variant mt-5 text-center text-xs">
        {isSignup ? "Already have an account?" : "New to Tacta?"}{" "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="text-primary font-bold underline-offset-4 hover:underline"
        >
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
