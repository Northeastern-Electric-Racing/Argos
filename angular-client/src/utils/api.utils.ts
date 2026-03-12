import { BehaviorSubject } from 'rxjs';

/**
 * The response from a query
 * @param isLoading Whether the query is loading or not
 * @param data The data returned from the query
 * @param isError Whether an error has occurred or not
 * @param error The error that has occurred
 */
export type QueryResponse<T> = {
  isLoading: BehaviorSubject<boolean>;
  data: BehaviorSubject<T | null>;
  isError: BehaviorSubject<boolean>;
  error: BehaviorSubject<Error | null>;
};
