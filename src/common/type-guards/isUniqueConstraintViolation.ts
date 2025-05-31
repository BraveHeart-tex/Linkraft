import { DatabaseError } from 'pg';

export const isUniqueConstraintViolation = (
  error: unknown,
  constraintName?: string
): error is DatabaseError => {
  if (
    error instanceof DatabaseError &&
    error.code === '23505' // unique violation code
  ) {
    if (constraintName) {
      return error.constraint === constraintName;
    }
    return true;
  }
  return false;
};
