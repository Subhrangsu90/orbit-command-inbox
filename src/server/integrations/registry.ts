import type { IntegrationDefinition, AgentTool } from "./types";

// ─── Gmail ──────────────────────────────────────────────────────────────────
import { gmailPlugin, gmailCredentials } from "./gmail/plugin";
import { gmailDefinition } from "./gmail/definition";
import { gmailTools, gmailSystemPrompt } from "./gmail/tools";

// ─── Google Calendar ────────────────────────────────────────────────────────
import { calendarPlugin, calendarCredentials } from "./googlecalendar/plugin";
import { calendarDefinition } from "./googlecalendar/definition";
import { calendarTools, calendarSystemPrompt } from "./googlecalendar/tools";

// ─── Registration ───────────────────────────────────────────────────────────
// To add a new integration (e.g. Zoom):
//   1. Create  src/server/integrations/zoom/{plugin,definition,tools}.ts
//   2. Import + add one entry to the array below.
// That's it — status, connect, disconnect, agent dispatch, and corsair plugin
// registration all pick it up automatically.

type IntegrationEntry = {
  definition: IntegrationDefinition;
  corsairPlugin?: unknown;
  corsairCredentials?: (env: any) => Record<string, unknown>;
  tools: AgentTool[];
  systemPrompt: string;
};

const integrations: IntegrationEntry[] = [
  {
    definition: gmailDefinition,
    corsairPlugin: gmailPlugin,
    corsairCredentials: gmailCredentials,
    tools: gmailTools,
    systemPrompt: gmailSystemPrompt,
  },
  {
    definition: calendarDefinition,
    corsairPlugin: calendarPlugin,
    corsairCredentials: calendarCredentials,
    tools: calendarTools,
    systemPrompt: calendarSystemPrompt,
  },
];

// ─── Helpers (consumed by corsair.ts, integrations router, agent service) ──

/** All IntegrationDefinitions (for integrations router: status, connect, disconnect). */
export function allDefinitions(): IntegrationDefinition[] {
  return integrations.map((i) => i.definition);
}

/** Find a single definition by its id (e.g. "gmail", "calendar"). */
export function findDefinition(id: string): IntegrationDefinition | undefined {
  return integrations.find((i) => i.definition.id === id)?.definition;
}



/** All agent tools flattened (for the LLM tool parameter). */
export function allAgentTools(): AgentTool[] {
  return integrations.flatMap((i) => i.tools);
}

/** Find a single agent tool by its function name (e.g. "send_email"). */
export function findAgentTool(name: string): AgentTool | undefined {
  return integrations
    .flatMap((i) => i.tools)
    .find((t) => t.definition.name === name);
}

/** All system prompt sections joined (for the agent system prompt). */
export function allSystemPromptSections(): string {
  return integrations.map((i) => i.systemPrompt).join("\n\n");
}
