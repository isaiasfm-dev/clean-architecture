// src/infrastructure/observability/LoggerFactory.ts
import pino, { type LoggerOptions } from "pino";

import type { Logger } from "#application/ports/Logger";
import { PinoLogger } from "#infrastructure/observability/PinoLogger";

const prettyTimeFormat = "SYS:dd/mm/yyyy HH:MM:ss.l";

export type PinoLogLevel = "debug" | "info" | "warn" | "error" | "silent";

export type PinoLoggerFactoryOptions = {
  readonly level: PinoLogLevel;
  readonly pretty: boolean;
};

/**
 * Construye la implementacion Pino del puerto `Logger` a partir de las
 * opciones de observabilidad de la composicion.
 *
 * `pretty` solo anade el transporte `pino-pretty` y su formato de tiempo;
 * cuando esta desactivado se conserva la configuracion estructurada de Pino.
 */
export class LoggerFactory {
  public static createLogger(factoryOptions: PinoLoggerFactoryOptions): Logger {
    const loggerOptions: LoggerOptions = {
      level: factoryOptions.level,
    };

    if (factoryOptions.pretty) {
      loggerOptions.transport = {
        target: "pino-pretty",
        options: {
          translateTime: prettyTimeFormat,
        },
      };
    }

    return new PinoLogger(pino(loggerOptions));
  }
}
