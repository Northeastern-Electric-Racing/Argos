/**
 * Response function type for all CRUD operations
 */
export type ResponseFunction<T> = (params?: string) => Promise<T>;
