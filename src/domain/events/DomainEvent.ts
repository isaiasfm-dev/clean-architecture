// src/domain/events/DomainEvent.ts
export type DomainEvent = {
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly type: string;
};
