# Tacta Workspace

Tacta is an AI-powered command centre and workflow automation workspace for Google Workspace, built to run under the `tacta.online` domain.

## Key Features

- **AI-Powered Inbox**: Read, summarize, and prioritize your emails automatically so you can focus on what actually matters.
- **Smart Calendar**: Automatically schedule meetings, resolve conflicts, set reminders, and manage event invitations.
- **Command Centre**: Use simple, fast command shortcuts to search and manage emails, contacts, and calendar events across your entire workspace.
- **Privacy First**: Built with minimal OAuth scopes. Message content is not stored on our servers.
- **Tacta Copilot**: A conversational AI agent that can draft responses, schedule events, list calendar availability, and search your mailbox.

## Tech Stack

This project is bootstrapped using the **T3 Stack**:
- [Next.js](https://nextjs.org) (App Router)
- [Better Auth](https://better-auth.com) (Authentication)
- [Drizzle ORM](https://orm.drizzle.team) (Database Access)
- [Tailwind CSS](https://tailwindcss.com) (Styling)
- [tRPC](https://trpc.io) (Typesafe API)

## Getting Started

1. **Environment Config**:
   Copy `.env.example` to `.env` and configure your database, Google OAuth credentials, and OpenAI API key settings.

2. **Run Postgres Database**:
   ```bash
   docker compose up -d postgres
   ```

3. **Database Setup**:
   ```bash
   pnpm db:push
   ```

4. **Start Dev Server**:
   ```bash
   pnpm dev
   ```

5. **Linting and Checking**:
   ```bash
   pnpm check
   ```
