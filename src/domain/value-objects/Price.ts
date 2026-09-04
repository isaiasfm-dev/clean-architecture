// src/domain/value-objects/Price.ts
import { CurrencyMismatch, InvalidPrice, InvalidQuantity } from "#domain/errors/DomainErrors";
import type { Currency } from "#domain/value-objects/Currency";

/**
 * Importe monetario valido dentro del dominio.
 *
 * El importe siempre se crea como numero finito, no negativo y redondeado a
 * dos decimales. Las operaciones entre precios conservan la moneda y rechazan
 * combinaciones que romperian la consistencia monetaria del pedido.
 */
export class Price {
  private constructor(
    public readonly amount: number,
    public readonly currency: Currency,
  ) {}

  /**
   * Construye un precio aplicando la normalizacion decimal del dominio.
   *
   * @throws InvalidPrice Si el importe no es finito o es negativo.
   */
  public static create(amount: number, currency: Currency): Price {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new InvalidPrice("Invalid amount");
    }

    const rounded = Math.round(amount * 100) / 100;

    return new Price(rounded, currency);
  }

  /**
   * Suma dos importes solo cuando pertenecen a la misma moneda.
   *
   * @throws CurrencyMismatch Si se intenta sumar importes con monedas distintas.
   */
  public add(other: Price): Price {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatch();
    }

    return Price.create(this.amount + other.amount, this.currency);
  }

  /**
   * Calcula un subtotal para una cantidad de unidades del mismo precio.
   *
   * @throws InvalidQuantity Si la cantidad no es un entero positivo.
   */
  public multiply(qty: number): Price {
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new InvalidQuantity();
    }

    return Price.create(this.amount * qty, this.currency);
  }

  public equals(other: Price): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}
