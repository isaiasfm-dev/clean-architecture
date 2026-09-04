// src/composition/environments/production.ts
import type { ConcreteAppContext } from "#composition/ConcreteAppContext";
import type { Logger } from "#application/ports/Logger";
import type { Config } from "#composition/config";
import { buildInMemoryAppContext } from "#composition/environments/inMemory";
import { buildPostgresAppContext } from "#composition/environments/postgres";

export function buildProductionContext(config: Config, logger?: Logger): ConcreteAppContext {
  if (config.USE_INMEMORY) {
    return buildInMemoryAppContext();
  }

  return buildPostgresAppContext(config, logger);
}
