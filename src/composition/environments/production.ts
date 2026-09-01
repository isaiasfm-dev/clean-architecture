// src/composition/environments/production.ts
import type { ConcreteAppContext } from "#composition/ConcreteAppContext";
import type { Config } from "#composition/config";
import { buildInMemoryAppContext } from "#composition/environments/inMemory";

export function buildProductionContext(config: Config): ConcreteAppContext {
  if (!config.USE_INMEMORY) {
    throw new Error(
      "Production real app context is not implemented yet: database, outbox and dispatcher are required.",
    );
  }

  if (config.USE_OUTBOX) {
    throw new Error("Production outbox and dispatcher are not implemented yet.");
  }

  return buildInMemoryAppContext();
}
