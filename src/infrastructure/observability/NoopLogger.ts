// src/infrastructure/observability/NoopLogger.ts
import type { Logger, LoggerContext } from "#application/ports/Logger";

/**
 * Implementacion vacia de `Logger` para configuraciones sin salida de logs.
 * Sus loggers hijos reutilizan la misma instancia porque no producen efectos
 * observables.
 */
export class NoopLogger implements Logger {
  public debug(_message: string, _obj?: LoggerContext): void {
    return undefined;
  }

  public info(_message: string, _obj?: LoggerContext): void {
    return undefined;
  }

  public warn(_message: string, _obj?: LoggerContext): void {
    return undefined;
  }

  public error(_message: string, _obj?: LoggerContext): void {
    return undefined;
  }

  public child(_context: LoggerContext): Logger {
    return this;
  }
}
