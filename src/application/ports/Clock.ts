// src/application/ports/Clock.ts
/**
 * Fuente de tiempo inyectable para que los casos de uso no dependan del reloj
 * del sistema.
 */
export interface Clock {
  now(): Date;
}
