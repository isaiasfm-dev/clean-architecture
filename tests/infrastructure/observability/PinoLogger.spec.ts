import { describe, expect, it, vi } from "vitest";

import { PinoLogger } from "#infrastructure/observability/PinoLogger";

describe("PinoLogger", () => {
  it("writes messages using pino structured logging", () => {
    const pino = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(),
    };
    const logger = new PinoLogger(pino as never);

    logger.info("message written", { operation: "test.operation", requestId: "request-1" });

    expect(pino.info).toHaveBeenCalledWith(
      {
        operation: "test.operation",
        requestId: "request-1",
      },
      "message written",
    );
  });

  it("creates child loggers with contextual fields", () => {
    const childPino = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(),
    };
    const pino = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(() => childPino),
    };
    const logger = new PinoLogger(pino as never);

    const child = logger.child({ requestId: "request-1" });
    child.error("child error", { operation: "test.child" });

    expect(pino.child).toHaveBeenCalledWith({ requestId: "request-1" });
    expect(childPino.error).toHaveBeenCalledWith(
      { operation: "test.child" },
      "child error",
    );
  });
});
