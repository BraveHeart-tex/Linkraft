export const buildUpdateDto = <T extends object>(
  initial: T,
  updates: Partial<T>
): Partial<T> => {
  const changed: Partial<T> = {};

  for (const key of Object.keys(updates) as (keyof T)[]) {
    if (!Object.prototype.hasOwnProperty.call(initial, key)) continue;

    const prevValue = initial[key];
    const nextValue = updates[key];

    if (!Object.is(prevValue, nextValue)) {
      changed[key] = nextValue;
    }
  }

  return changed;
};
