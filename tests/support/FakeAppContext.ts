import type { AppContext } from "#application/AppContext";
import type { Clock } from "#application/ports/Clock";
import type { DomainEventPublisher } from "#application/ports/DomainEventPublisher";
import type { PriceProvider } from "#application/ports/PriceProvider";
import type {
  TransactionalAppContext,
  UnitOfWork,
} from "#application/ports/UnitOfWork";
import type { DomainEvent } from "#domain/events/DomainEvent";
import type { Price } from "#domain/value-objects/Price";
import type { SKU } from "#domain/value-objects/SKU";
import { ok, type Result } from "#shared/result";
import { FakeOrderRepository } from "./FakeOrderRepository.js";

/**
 * Sustituciones de dependencias para aislar un caso de uso en las pruebas.
 *
 * El contexto predeterminado usa un reloj fijo, un proveedor de precios que no
 * encuentra precios y una unidad de trabajo que ejecuta la funcion recibida
 * directamente, sin transaccion ni rollback.
 */
type FakeAppContextOverrides = Partial<AppContext> & {
  eventBus?: DomainEventPublisher;
};

class FakeClock implements Clock {
  public now(): Date {
    return new Date("2026-08-30T10:00:00.000Z");
  }
}

class NullPriceProvider implements PriceProvider {
  public async getCurrentPrice(_sku: SKU, _requestedAt: Date): Promise<Price | null> {
    return null;
  }
}

class NoopEventBus implements DomainEventPublisher {
  public async publish(_events: DomainEvent[]): Promise<Result<void, never>> {
    return ok(undefined);
  }
}

class FakeUnitOfWork implements UnitOfWork {
  public constructor(private readonly context: TransactionalAppContext) {}

  public async run<T>(work: (context: TransactionalAppContext) => Promise<T>): Promise<T> {
    return work(this.context);
  }
}

/**
 * Crea un contexto minimo de pruebas con dobles configurables para el
 * repositorio, la unidad de trabajo y el publicador de eventos.
 */
export function createFakeAppContext(overrides: FakeAppContextOverrides = {}): AppContext {
  const orderRepository = overrides.orderRepository ?? new FakeOrderRepository();
  const eventBus = overrides.eventBus ?? new NoopEventBus();

  return {
    orderRepository,
    unitOfWork: overrides.unitOfWork ?? new FakeUnitOfWork({ orderRepository, eventBus }),
    priceProvider: new NullPriceProvider(),
    clock: new FakeClock(),
    ...overrides,
  };
}
