export type Ok<T> = {
  ok: true;
  value: T;
};

export type Fail<E> = {
  ok: false;
  error: E;
};

export type Result<T, E> = Ok<T> | Fail<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });

export const fail = <E>(error: E): Fail<E> => ({ ok: false, error });
