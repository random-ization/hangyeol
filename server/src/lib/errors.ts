/**
 * Type-safe error handling utilities
 */

/**
 * Type guard to check if an error is an Error instance
 */
export const isError = (e: unknown): e is Error => {
    return e instanceof Error;
};

/**
 * Get error message safely from unknown error
 */
export const getErrorMessage = (e: unknown): string => {
    if (e instanceof Error) return e.message;
    if (typeof e === 'string') return e;
    return 'Unknown error';
};

/**
 * Get error name safely from unknown error
 */
export const getErrorName = (e: unknown): string => {
    if (e instanceof Error) return e.name;
    return 'UnknownError';
};

/**
 * Check if error is a Zod validation error
 */
export const isZodError = (e: unknown): e is Error & { errors: unknown[] } => {
    return e instanceof Error && e.name === 'ZodError' && 'errors' in e;
};
