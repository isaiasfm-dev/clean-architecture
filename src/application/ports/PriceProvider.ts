// src/application/ports/PriceProvider.ts
import type { Price } from "#domain/value-objects/Price";
import type { SKU } from "#domain/value-objects/SKU";

/**
 * Puerto para consultar el precio vigente de un SKU en un instante concreto.
 *
 * El caso de uso no acepta precios del cliente: los obtiene por este puerto y
 * trata `null` como ausencia de precio disponible.
 */
export interface PriceProvider {
  getCurrentPrice(sku: SKU, requestedAt: Date): Promise<Price | null>;
}
