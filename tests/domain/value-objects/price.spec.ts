import { describe, expect, it } from "vitest";

import { Price } from "#domain/value-objects/price";

describe("Price", () => {
  it("creates a price with amount and normalized currency", () => {
    const price = Price.create(10.5, "eur");

    expect(price.amount).toBe(10.5);
    expect(price.currency).toBe("EUR");
  });

  it("creates prices only with supported currencies", () => {
    expect(Price.create(10, "EUR").currency).toBe("EUR");
    expect(Price.create(10, "usd").currency).toBe("USD");
  });

  it("rounds the amount to two decimal places", () => {
    expect(Price.create(10.555, "EUR").amount).toBe(10.56);
    expect(Price.create(10.554, "USD").amount).toBe(10.55);
  });

  it("compares prices by value", () => {
    expect(Price.create(10, "EUR").equals(Price.create(10, "eur"))).toBe(true);
    expect(Price.create(10, "EUR").equals(Price.create(12, "EUR"))).toBe(false);
  });

  it("rejects invalid amounts", () => {
    expect(() => Price.create(Number.NaN, "EUR")).toThrow("finite number");
    expect(() => Price.create(-1, "EUR")).toThrow("cannot be negative");
  });

  it("rejects invalid currencies", () => {
    expect(() => Price.create(10, "")).toThrow("EUR or USD");
    expect(() => Price.create(10, "GBP")).toThrow("EUR or USD");
  });
});
