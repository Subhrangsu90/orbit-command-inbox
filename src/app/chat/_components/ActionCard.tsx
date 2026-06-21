"use client";

import type { ExecutedAction } from "../types";
import { actionCardRegistry } from "./actionCards";

export function ActionCard({ action }: { action: ExecutedAction }) {
  const renderer = actionCardRegistry[action.type];
  return renderer ? renderer(action) : null;
}
