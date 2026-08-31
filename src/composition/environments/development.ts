import type { ConcreteAppContext } from "#composition/ConcreteAppContext";
import type { Config } from "#composition/config";
import { buildInMemoryAppContext } from "#composition/environments/inMemory";

export function buildDevelopmentContext(config: Config): ConcreteAppContext {
  if (!config.USE_INMEMORY) {
    throw new Error("Development without in-memory adapters is not implemented yet.");
  }

  if (config.USE_OUTBOX) {
    throw new Error("Development outbox is not implemented yet. Set USE_OUTBOX=false.");
  }

  return buildInMemoryAppContext();
}
