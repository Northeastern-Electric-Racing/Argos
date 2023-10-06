import { JsonObject } from '@prisma/client/runtime/library';

/**
 * Response function type for all CRUD operations
 */
export type ResponseFunction<T> = (data?: JsonObject) => Promise<T>;
