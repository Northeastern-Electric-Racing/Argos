import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { QueryResponse } from 'src/utils/api.utils';

/**
 * Service for interacting with the api
 */
@Injectable({ providedIn: 'root' })
export default class APIService {
  private cache = new Map<
    string,
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: BehaviorSubject<any | null>;
      isLoading: BehaviorSubject<boolean>;
      isError: BehaviorSubject<boolean>;
      error: BehaviorSubject<Error | null>;
      fetchFn: () => Promise<Response>;
    }
  >();
  /**
   * Function to query data from the api
   * @param apiCall The api call to make
   * @returns A query response
   */
  public query<T>(
    apiCall: () => Promise<Response>,
    options: { queryKey?: string[]; invalidates?: string[] } = {}
  ): QueryResponse<T> {
    const { queryKey, invalidates } = options;
    let cacheKey;
    if (queryKey) {
      cacheKey = this.getQueryKey(queryKey);

      // If cached, return existing observables
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)!;
      }
    }

    // Create new reactive subjects
    const data = new BehaviorSubject<T | null>(null);
    const isLoading = new BehaviorSubject<boolean>(true);
    const isError = new BehaviorSubject<boolean>(false);
    const error = new BehaviorSubject<Error | null>(null);

    // Fetch and cache data
    this.fetchData(apiCall, data, isLoading, isError, error, invalidates);

    // Store in cache
    const queryState = { data, isLoading, isError, error, fetchFn: apiCall };
    if (cacheKey) {
      this.cache.set(cacheKey, queryState);
    }

    return queryState;
  }

  private invalidateQuery(queryKey: string[]): void {
    const cacheKey = this.getQueryKey(queryKey);

    if (this.cache.has(cacheKey)) {
      const cachedQuery = this.cache.get(cacheKey)!;

      cachedQuery.data.next(null);
      cachedQuery.isLoading.next(true);
      cachedQuery.isError.next(false);
      cachedQuery.error.next(null);

      this.fetchData(cachedQuery.fetchFn, cachedQuery.data, cachedQuery.isLoading, cachedQuery.isError, cachedQuery.error);
    }
  }

  private fetchData<T>(
    apiCall: () => Promise<Response>,
    data: BehaviorSubject<T | null>,
    isLoading: BehaviorSubject<boolean>,
    isError: BehaviorSubject<boolean>,
    error: BehaviorSubject<Error | null>,
    invalidates?: string[]
  ) {
    isLoading.next(true);
    isError.next(false);

    apiCall()
      .then((response) => this.handleErrors(response))
      .then((response) => response.json() as Promise<T>)
      .then((resolvedData) => {
        data.next(resolvedData);
        isLoading.next(false);
      })
      .catch((err) => {
        if (err instanceof Error) {
          isError.next(true);
          error.next(err);
        }
      })
      .finally(() => {
        if (invalidates) {
          this.invalidateQuery(invalidates);
        }
      });
  }

  private getQueryKey(queryKey: string[]): string {
    return queryKey.join('-'); // Create a unique key
  }

  /**
   * Rejects a failed response with its status text, so the catch below reports it once. Scylla's
   * error bodies are plain text, so parsing them as JSON would only add a second, raw parse error.
   * @param response The response to check for errors
   * @returns The response, if it succeeded
   */
  private handleErrors(response: Response): Response {
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    return response;
  }
}
