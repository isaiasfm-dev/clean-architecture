export class Price {
  private static readonly supportedCurrencies = ["EUR", "USD"] as const;
  private static readonly decimalPlaces = 2;

  public readonly amount: number;
  public readonly currency: string;

  private constructor(amount: number, currency: string) {
    this.amount = amount;
    this.currency = currency;
  }

  public static create(amount: number, currency: string): Price {
    Price.ensureValidAmount(amount);

    const roundedAmount = Price.roundAmount(amount);
    const normalizedCurrency = Price.normalizeCurrency(currency);

    Price.ensureValidCurrency(normalizedCurrency);

    return new Price(roundedAmount, normalizedCurrency);
  }

  public equals(other: Price): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  private static ensureValidAmount(amount: number): void {
    if (!Number.isFinite(amount)) {
      throw new Error("Price amount must be a finite number");
    }

    if (amount < 0) {
      throw new Error("Price amount cannot be negative");
    }
  }

  private static normalizeCurrency(currency: string): string {
    return currency.trim().toUpperCase();
  }

  private static ensureValidCurrency(currency: string): void {
    if (!Price.isSupportedCurrency(currency)) {
      throw new Error("Price currency must be EUR or USD");
    }
  }

  private static isSupportedCurrency(currency: string): boolean {
    return Price.supportedCurrencies.some((supportedCurrency) => supportedCurrency === currency);
  }

  private static roundAmount(amount: number): number {
    const factor = 10 ** Price.decimalPlaces;

    return Math.round(amount * factor) / factor;
  }
}
