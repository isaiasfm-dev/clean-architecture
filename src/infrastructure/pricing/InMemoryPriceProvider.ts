// src/infrastructure/pricing/InMemoryPriceProvider.ts
import type { PriceProvider } from "#application/ports/PriceProvider";
import { Price } from "#domain/value-objects/Price";
import type { SKU } from "#domain/value-objects/SKU";

export class InMemoryPriceProvider implements PriceProvider {
  private readonly prices = new Map<string, Price>([
    ["sku-1", Price.create(12.35, "EUR")],
    ["sku-2", Price.create(5, "EUR")],
  ]);

  public async getCurrentPrice(sku: SKU, _requestedAt: Date): Promise<Price | null> {
    return this.prices.get(sku.value) ?? null;
  }
}
