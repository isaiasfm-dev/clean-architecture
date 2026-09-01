// src/domain/value-objects/Price.ts
import { CurrencyMismatch, InvalidPrice, InvalidQuantity } from "#domain/errors/DomainErrors";
import type { Currency } from "#domain/value-objects/Currency";

export class Price {
  private constructor(
    public readonly amount: number,
    public readonly currency: Currency,
  ) {}

  public static create(amount: number, currency: Currency): Price {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new InvalidPrice("Invalid amount");
    }

    const rounded = Math.round(amount * 100) / 100;

    return new Price(rounded, currency);
  }

  public add(other: Price): Price {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatch();
    }

    return Price.create(this.amount + other.amount, this.currency);
  }

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
