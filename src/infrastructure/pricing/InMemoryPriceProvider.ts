// src/infrastructure/pricing/InMemoryPriceProvider.ts
import type { PriceProvider } from "#application/ports/PriceProvider";
import { Price } from "#domain/value-objects/Price";
import type { SKU } from "#domain/value-objects/SKU";

export class InMemoryPriceProvider implements PriceProvider {
  private readonly prices = new Map<string, Price>([
    ["LAPTOP-001", Price.create(899.99, "EUR")],
    ["DESKTOP-001", Price.create(749.9, "EUR")],
    ["MONITOR-027", Price.create(229.99, "EUR")],
    ["KEYBOARD-001", Price.create(79.95, "EUR")],
    ["MOUSE-001", Price.create(39.99, "EUR")],
    ["SSD-001", Price.create(94.5, "EUR")],
    ["RAM-016", Price.create(68.99, "EUR")],
    ["GPU-4060", Price.create(329.0, "EUR")],
    ["ROUTER-001", Price.create(119.95, "EUR")],
    ["WEBCAM-001", Price.create(54.99, "EUR")],
  ]);

  public async getCurrentPrice(sku: SKU, _requestedAt: Date): Promise<Price | null> {
    return this.prices.get(sku.value) ?? null;
  }
}
