// src/shared/result.ts
/**
 * Variante exitosa de `Result`, cuyo valor esta disponible en `value`.
 */
export type Ok<T> = {
  ok: true;
  value: T;
};

/**
 * Variante fallida de `Result`, cuyo error esta disponible en `error`.
 */
export type Fail<E> = {
  ok: false;
  error: E;
};

/**
 * Resultado discriminado para devolver un valor o un error esperado sin
 * confundirlo con una excepcion lanzada por el flujo.
 *
 * La propiedad booleana `ok` permite discriminar las dos variantes mediante
 * narrowing de TypeScript.
 */
export type Result<T, E> = Ok<T> | Fail<E>;

/** Construye la variante exitosa de un resultado. */
export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });

/** Construye la variante fallida de un resultado. */
export const fail = <E>(error: E): Fail<E> => ({ ok: false, error });
