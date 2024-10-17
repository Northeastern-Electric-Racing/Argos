import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { QueryResponse } from 'src/utils/api.utils';

/**
 * Service for interacting with the api
 */
@Injectable({ providedIn: 'root' })
export default class APIService {
  /**
   * Function to query data from the api
   * @param apiCall The api call to make
   * @returns A query response
   */
  public query<T>(apiCall: () => Promise<Response>): QueryResponse<T> {
    const data = new Subject<T>();
    const isLoading = new Subject<boolean>();
    const isError = new Subject<boolean>();
    const error = new Subject<Error>();
    isLoading.next(true);
    isError.next(false);
    apiCall()
      .then((response) => this.handleErrors(response, error, isError))
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
      });
    return {
      data,
      isLoading,
      isError,
      error
    };
  }

  /**
   * Handles any errors that may have occurred during the api call
   * @param response The response to check for errors
   * @param error The error subject to emit errors to
   * @param isError boolean subject to emit whether or not an error has occurred
   * @returns The response
   */
  private handleErrors(response: Response, error: Subject<Error>, isError: Subject<boolean>): Response {
    if (!response.ok) {
      isError.next(true);
      error.next(new Error(response.statusText));
    }
    return response;
  }
}
