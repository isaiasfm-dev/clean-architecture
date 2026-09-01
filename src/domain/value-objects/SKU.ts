// src/domain/value-objects/SKU.ts
export class SKU {
  private constructor(public readonly value: string) {}

  public static create(value: string): SKU {
    return new SKU(value);
  }

  public equals(other: SKU): boolean {
    return this.value === other.value;
  }
}
