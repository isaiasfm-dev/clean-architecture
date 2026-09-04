import pino from "pino";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerFactory } from "#infrastructure/observability/LoggerFactory";

vi.mock("pino", () => ({
  default: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(),
  })),
}));

function loggerOptions(
  overrides: Partial<Parameters<typeof LoggerFactory.createLogger>[0]> = {},
): Parameters<typeof LoggerFactory.createLogger>[0] {
  return {
    level: "debug",
    pretty: true,
    ...overrides,
  };
}

describe("LoggerFactory", () => {
  beforeEach(() => {
    vi.mocked(pino).mockClear();
  });

  it("configures pretty logs with a local short date and time", () => {
    LoggerFactory.createLogger(loggerOptions());

    expect(pino).toHaveBeenCalledWith({
      level: "debug",
      transport: {
        target: "pino-pretty",
        options: {
          translateTime: "SYS:dd/mm/yyyy HH:MM:ss.l",
        },
      },
    });
  });

  it("keeps structured logs without pretty transport when LOG_PRETTY is false", () => {
    LoggerFactory.createLogger(loggerOptions({ pretty: false, level: "info" }));

    expect(pino).toHaveBeenCalledWith({
      level: "info",
    });
  });
});
