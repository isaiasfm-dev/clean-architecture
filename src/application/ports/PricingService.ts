import type { Price } from "#domain/value-objects/Price";
import type { SKU } from "#domain/value-objects/SKU";

export interface PricingService {
  getCurrentPrice(sku: SKU, requestedAt: Date): Promise<Price | null>;
}
