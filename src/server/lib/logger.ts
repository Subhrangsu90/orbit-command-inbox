type LogContext = Record<string, unknown>;

export const logger = {
  info(message: string, context?: LogContext) {
    console.info(`[INFO] ${message}`, context ? JSON.stringify(context) : "");
  },
  warn(message: string, context?: LogContext) {
    console.warn(`[WARN] ${message}`, context ? JSON.stringify(context) : "");
  },
  error(message: string, error?: unknown, context?: LogContext) {
    console.error(
      `[ERROR] ${message}`,
      error instanceof Error ? error.stack || error.message : error,
      context ? JSON.stringify(context) : ""
    );
  },
};
