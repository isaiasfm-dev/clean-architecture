// src/infrastructure/observability/PinoLogger.ts
import type { Logger as PinoLoggerInstance } from "pino";

import type { Logger, LoggerContext } from "#application/ports/Logger";

export class PinoLogger implements Logger {
  public constructor(private readonly logger: PinoLoggerInstance) {}

  public debug(message: string, obj?: LoggerContext): void {
    this.logger.debug(obj ?? {}, message);
  }

  public info(message: string, obj?: LoggerContext): void {
    this.logger.info(obj ?? {}, message);
  }

  public warn(message: string, obj?: LoggerContext): void {
    this.logger.warn(obj ?? {}, message);
  }

  public error(message: string, obj?: LoggerContext): void {
    this.logger.error(obj ?? {}, message);
  }

  public child(context: LoggerContext): Logger {
    return new PinoLogger(this.logger.child(context));
  }
}
