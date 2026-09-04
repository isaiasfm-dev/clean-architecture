import { describe, expect, it } from "vitest";

import { getDatabaseUrl, loadConfig } from "#composition/config";

describe("loadConfig", () => {
  it("uses development defaults for local in-memory execution", () => {
    expect(loadConfig({})).toEqual({
      NODE_ENV: "development",
      DATABASE_URL: undefined,
      DATABASE_POOL_MAX: 10,
      DATABASE_IDLE_TIMEOUT_MS: 30000,
      DATABASE_CONNECTION_TIMEOUT_MS: 2000,
      PRICING_BASE_URL: "http://localhost:4000",
      USE_INMEMORY: true,
      USE_OUTBOX: false,
      OUTBOX_WORKER_MODE: "once",
      OUTBOX_POLL_INTERVAL_MS: 5000,
      OUTBOX_BATCH_SIZE: 100,
      LOG_LEVEL: "debug",
      LOG_PRETTY: true,
      PRICING_TIMEOUT_MS: 5000,
      PORT: 3000,
    });
  });

  it("uses production defaults for real infrastructure", () => {
    expect(loadConfig({ NODE_ENV: "production" })).toEqual({
      NODE_ENV: "production",
      DATABASE_URL: undefined,
      DATABASE_POOL_MAX: 10,
      DATABASE_IDLE_TIMEOUT_MS: 30000,
      DATABASE_CONNECTION_TIMEOUT_MS: 2000,
      PRICING_BASE_URL: "http://localhost:4000",
      USE_INMEMORY: false,
      USE_OUTBOX: true,
      OUTBOX_WORKER_MODE: "once",
      OUTBOX_POLL_INTERVAL_MS: 5000,
      OUTBOX_BATCH_SIZE: 100,
      LOG_LEVEL: "info",
      LOG_PRETTY: false,
      PRICING_TIMEOUT_MS: 1000,
      PORT: 3000,
    });
  });

  it("parses environment values into application config types", () => {
    expect(
      loadConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgres://user:password@localhost:5432/orders",
        DATABASE_POOL_MAX: "20",
        DATABASE_IDLE_TIMEOUT_MS: "45000",
        DATABASE_CONNECTION_TIMEOUT_MS: "3000",
        PRICING_BASE_URL: "https://pricing.example.com",
        USE_INMEMORY: "true",
        USE_OUTBOX: "false",
        OUTBOX_WORKER_MODE: "loop",
        OUTBOX_POLL_INTERVAL_MS: "1000",
        OUTBOX_BATCH_SIZE: "50",
        LOG_LEVEL: "warn",
        LOG_PRETTY: "false",
        PRICING_TIMEOUT_MS: "750",
        PORT: "8080",
      }),
    ).toEqual({
      NODE_ENV: "production",
      DATABASE_URL: "postgres://user:password@localhost:5432/orders",
      DATABASE_POOL_MAX: 20,
      DATABASE_IDLE_TIMEOUT_MS: 45000,
      DATABASE_CONNECTION_TIMEOUT_MS: 3000,
      PRICING_BASE_URL: "https://pricing.example.com",
      USE_INMEMORY: true,
      USE_OUTBOX: false,
      OUTBOX_WORKER_MODE: "loop",
      OUTBOX_POLL_INTERVAL_MS: 1000,
      OUTBOX_BATCH_SIZE: 50,
      LOG_LEVEL: "warn",
      LOG_PRETTY: false,
      PRICING_TIMEOUT_MS: 750,
      PORT: 8080,
    });
  });

  it("supports USE_MEMORY as a legacy alias for USE_INMEMORY", () => {
    expect(loadConfig({ USE_MEMORY: "false" }).USE_INMEMORY).toBe(false);
  });

  it("returns a required database url through getDatabaseUrl", () => {
    const config = loadConfig({
      DATABASE_URL: "postgres://user:password@localhost:5432/orders",
    });

    expect(getDatabaseUrl(config)).toBe("postgres://user:password@localhost:5432/orders");
  });

  it("throws through getDatabaseUrl when database url is missing", () => {
    expect(() => getDatabaseUrl(loadConfig({}))).toThrow(
      "DATABASE_URL is required when using PostgreSQL.",
    );
  });

  it("rejects invalid environment names", () => {
    expect(() => loadConfig({ NODE_ENV: "staging" })).toThrow();
  });

  it("rejects invalid urls", () => {
    expect(() => loadConfig({ DATABASE_URL: "not-a-url" })).toThrow();
    expect(() => loadConfig({ PRICING_BASE_URL: "not-a-url" })).toThrow();
  });

  it("rejects invalid boolean and port values", () => {
    expect(() => loadConfig({ DATABASE_POOL_MAX: "0" })).toThrow();
    expect(() => loadConfig({ DATABASE_IDLE_TIMEOUT_MS: "0" })).toThrow();
    expect(() => loadConfig({ DATABASE_CONNECTION_TIMEOUT_MS: "0" })).toThrow();
    expect(() => loadConfig({ USE_INMEMORY: "yes" })).toThrow();
    expect(() => loadConfig({ USE_OUTBOX: "yes" })).toThrow();
    expect(() => loadConfig({ OUTBOX_WORKER_MODE: "daemon" })).toThrow();
    expect(() => loadConfig({ OUTBOX_POLL_INTERVAL_MS: "0" })).toThrow();
    expect(() => loadConfig({ OUTBOX_BATCH_SIZE: "0" })).toThrow();
    expect(() => loadConfig({ LOG_PRETTY: "yes" })).toThrow();
    expect(() => loadConfig({ LOG_LEVEL: "verbose" })).toThrow();
    expect(() => loadConfig({ PRICING_TIMEOUT_MS: "0" })).toThrow();
    expect(() => loadConfig({ PORT: "0" })).toThrow();
  });
});
