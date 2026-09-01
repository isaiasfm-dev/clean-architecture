// src/composition/environments/test.ts
import type { ConcreteAppContext } from "#composition/ConcreteAppContext";
import type { Config } from "#composition/config";
import { buildInMemoryAppContext } from "#composition/environments/inMemory";

export function buildTestContext(config: Config): ConcreteAppContext {
  if (!config.USE_INMEMORY) {
    throw new Error("Test database adapters are not implemented yet.");
  }

  if (config.USE_OUTBOX) {
    throw new Error("Test outbox is not implemented yet. Set USE_OUTBOX=false.");
  }

  return buildInMemoryAppContext();
}
