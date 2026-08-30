import type { Clock } from "#application/ports/Clock";

export class SystemClock implements Clock {
  public now(): Date {
    return new Date();
  }
}
