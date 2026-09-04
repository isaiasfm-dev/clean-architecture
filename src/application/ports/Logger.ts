// src/application/ports/Logger.ts
/**
 * Metadatos estructurados que acompanan a un log sin acoplar la aplicacion a
 * una libreria concreta de observabilidad.
 */
export type LoggerContext = {
  readonly requestId?: string;
  readonly userId?: string;
  readonly operation?: string;
  readonly [key: string]: unknown;
};

/**
 * Abstraccion de logging usada por la aplicacion y los adaptadores para crear
 * loggers enriquecidos con contexto.
 */
export interface Logger {
  debug(message: string, obj?: LoggerContext): void;
  info(message: string, obj?: LoggerContext): void;
  warn(message: string, obj?: LoggerContext): void;
  error(message: string, obj?: LoggerContext): void;
  child(context: LoggerContext): Logger;
}
