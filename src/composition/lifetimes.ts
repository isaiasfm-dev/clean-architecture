// src/composition/lifetimes.ts
import type { AppContext } from "#application/AppContext";

export type Lifetime = "singleton" | "scoped" | "transient";

export type AppContextLifetimeMap = Record<keyof AppContext, Lifetime>;
export type RequestScopeLifetimeMap = {
  requestId: Lifetime;
};

export const appContextLifetimes = {
  orderRepository: "singleton",
  unitOfWork: "singleton",
  priceProvider: "singleton",
  clock: "singleton",
} satisfies AppContextLifetimeMap;

export const requestScopeLifetimes = {
  requestId: "scoped",
} satisfies RequestScopeLifetimeMap;
