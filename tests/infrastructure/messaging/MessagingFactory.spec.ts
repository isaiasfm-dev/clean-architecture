import type { Pool } from "pg";
import { describe, expect, it } from "vitest";

import type { Logger, LoggerContext } from "#application/ports/Logger";
import { loadConfig } from "#composition/config";
import { toMessagingOptions } from "#composition/adapterOptions";
import { NoopDomainEventPublisher } from "#infrastructure/events/NoopDomainEventPublisher";
import { DomainEventOutboxPublisher } from "#infrastructure/messaging/DomainEventOutboxPublisher";
import { OutboxDispatcher, OutboxWorker } from "#infrastructure/messaging/OutboxDispatcher";
import { MessagingFactory } from "#infrastructure/messaging/MessagingFactory";

type DispatcherInternals = OutboxDispatcher & {
  readonly batchSize: number;
};

type WorkerInternals = OutboxWorker & {
  readonly dispatcher: OutboxDispatcher;
  readonly mode: string;
  readonly intervalMs: number;
};

type LogEntry = {
  readonly level: "debug" | "info" | "warn" | "error";
  readonly message: string;
  readonly obj?: LoggerContext;
};

class RecordingLogger implements Logger {
  public readonly entries: LogEntry[] = [];

  public debug(message: string, obj?: LoggerContext): void {
    this.entries.push({ level: "debug", message, obj });
  }

  public info(message: string, obj?: LoggerContext): void {
    this.entries.push({ level: "info", message, obj });
  }

  public warn(message: string, obj?: LoggerContext): void {
    this.entries.push({ level: "warn", message, obj });
  }

  public error(message: string, obj?: LoggerContext): void {
    this.entries.push({ level: "error", message, obj });
  }

  public child(context: LoggerContext): Logger {
    const parent = this;

    return {
      debug(message, obj) {
        parent.debug(message, { ...context, ...obj });
      },
      info(message, obj) {
        parent.info(message, { ...context, ...obj });
      },
      warn(message, obj) {
        parent.warn(message, { ...context, ...obj });
      },
      error(message, obj) {
        parent.error(message, { ...context, ...obj });
      },
      child(childContext) {
        return parent.child({ ...context, ...childContext });
      },
    };
  }
}

describe("MessagingFactory", () => {
  it("creates a noop event bus when outbox is disabled", () => {
    const config = loadConfig({ USE_OUTBOX: "false" });
    const factory = new MessagingFactory(toMessagingOptions(config));

    expect(factory.createEventBus({} as never)).toBeInstanceOf(NoopDomainEventPublisher);
  });

  it("creates an outbox event bus when outbox is enabled", () => {
    const config = loadConfig({ USE_OUTBOX: "true" });
    const factory = new MessagingFactory(toMessagingOptions(config));

    expect(factory.createEventBus({} as never)).toBeInstanceOf(DomainEventOutboxPublisher);
  });

  it("creates outbox dispatchers with the configured batch size", () => {
    const config = loadConfig({
      OUTBOX_BATCH_SIZE: "25",
    });
    const factory = new MessagingFactory(toMessagingOptions(config));
    const dispatcher = factory.createOutboxDispatcher({} as Pool);

    expect(dispatcher).toBeInstanceOf(OutboxDispatcher);
    expect((dispatcher as DispatcherInternals).batchSize).toBe(25);
  });

  it("creates outbox workers with the configured mode and interval", () => {
    const config = loadConfig({
      OUTBOX_WORKER_MODE: "loop",
      OUTBOX_POLL_INTERVAL_MS: "1500",
    });
    const factory = new MessagingFactory(toMessagingOptions(config));
    const dispatcher = factory.createOutboxDispatcher({} as Pool, async () => undefined);
    const worker = factory.createOutboxWorker(dispatcher);

    expect(worker).toBeInstanceOf(OutboxWorker);
    expect((worker as WorkerInternals).dispatcher).toBe(dispatcher);
    expect((worker as WorkerInternals).mode).toBe("loop");
    expect((worker as WorkerInternals).intervalMs).toBe(1500);
  });

  it("uses a default outbox handler that logs dispatched events", async () => {
    const config = loadConfig({});
    const logger = new RecordingLogger();
    const factory = new MessagingFactory(toMessagingOptions(config), logger);
    const dispatcher = factory.createOutboxDispatcher({} as Pool);
    const handler = (dispatcher as OutboxDispatcher & {
      readonly handler: (event: unknown) => Promise<void>;
    }).handler;

    await handler({
      id: "outbox-1",
      eventType: "order.created",
    });

    expect(logger.entries).toEqual([
      {
        level: "info",
        message: "outbox event dispatched",
        obj: {
          operation: "outbox.dispatch",
          outboxId: "outbox-1",
          eventType: "order.created",
        },
      },
    ]);
  });
});
