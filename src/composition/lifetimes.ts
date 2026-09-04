// src/composition/lifetimes.ts
import type { AppContext } from "#application/AppContext";

/**
 * Etiquetas documentales para describir el ciclo de vida esperado en la
 * composicion manual del proyecto.
 */
export type Lifetime = "singleton" | "scoped" | "transient";

export type AppContextLifetimeMap = Record<keyof AppContext, Lifetime>;
export type RequestScopeLifetimeMap = {
  requestId: Lifetime;
};

/**
 * Dependencias creadas al ensamblar el contexto de aplicacion y reutilizadas por
 * los casos de uso construidos sobre ese contexto.
 */
export const appContextLifetimes = {
  orderRepository: "singleton",
  unitOfWork: "singleton",
  priceProvider: "singleton",
  clock: "singleton",
} satisfies AppContextLifetimeMap;

/**
 * Dependencias creadas por scope de peticion HTTP.
 *
 * En este repositorio `scoped` significa que `makeRequestScope` genera un
 * `requestId` nuevo sin reconstruir los casos de uso de aplicacion.
 */
export const requestScopeLifetimes = {
  requestId: "scoped",
} satisfies RequestScopeLifetimeMap;
