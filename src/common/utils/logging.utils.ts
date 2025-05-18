export function getErrorStack(error: unknown): string {
  if (!error) return '';
  if (error instanceof Error) return error.stack ?? '';
  if (
    typeof error === 'object' &&
    'stack' in error &&
    typeof error.stack === 'string'
  ) {
    return error.stack;
  }
  return '';
}
