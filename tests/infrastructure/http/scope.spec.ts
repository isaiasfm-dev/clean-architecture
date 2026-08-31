import { describe, expect, it } from "vitest";

import { buildAppContext, createContainer } from "#composition/container";
import type { Config } from "#composition/config";
import { makeRequestScope } from "#infrastructure/http/scope";

function config(overrides: Partial<Config> = {}): Config {
  return {
    NODE_ENV: "test",
    DATABASE_URL: "postgres://user:password@localhost:5432/orders",
    PRICING_BASE_URL: "http://localhost:4000",
    USE_INMEMORY: true,
    USE_OUTBOX: false,
    LOG_LEVEL: "silent",
    PRICING_TIMEOUT_MS: 5000,
    PORT: 3000,
    ...overrides,
  };
}

describe("makeRequestScope", () => {
  it("adds a request id without recreating application use cases", () => {
    const container = createContainer(buildAppContext(config()));
    const scope = makeRequestScope(container);

    expect(scope.useCases).toBe(container.useCases);
    expect(scope.requestId).toEqual(expect.any(String));
    expect(scope.requestId).toHaveLength(36);
  });

  it("creates a different request id for each scope", () => {
    const container = createContainer(buildAppContext(config()));

    expect(makeRequestScope(container).requestId).not.toBe(
      makeRequestScope(container).requestId,
    );
  });
});
