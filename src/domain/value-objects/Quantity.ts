// src/domain/value-objects/Quantity.ts
import { InvalidQuantity } from "#domain/errors/DomainErrors";

export class Quantity {
  private constructor(public readonly value: number) {}

  public static create(value: number): Quantity {
    if (!Number.isInteger(value) || value <= 0) {
      throw new InvalidQuantity();
    }

    return new Quantity(value);
  }

  public equals(other: Quantity): boolean {
    return this.value === other.value;
  }
}
