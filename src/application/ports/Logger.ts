// src/application/ports/Logger.ts
export type LoggerContext = {
  readonly requestId?: string;
  readonly userId?: string;
  readonly operation?: string;
  readonly [key: string]: unknown;
};

export interface Logger {
  debug(message: string, obj?: LoggerContext): void;
  info(message: string, obj?: LoggerContext): void;
  warn(message: string, obj?: LoggerContext): void;
  error(message: string, obj?: LoggerContext): void;
  child(context: LoggerContext): Logger;
}
