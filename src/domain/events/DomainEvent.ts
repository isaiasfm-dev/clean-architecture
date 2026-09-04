// src/domain/events/DomainEvent.ts
/**
 * Contrato minimo que permite asociar un evento al agregado que lo produjo.
 *
 * Los eventos concretos pueden restringir `aggregateType` y `type` para cada
 * agregado sin acoplar el dominio a un mecanismo de mensajeria concreto.
 */
export type DomainEvent = {
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly type: string;
};
