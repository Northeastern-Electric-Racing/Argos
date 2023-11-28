import { urls } from './urls';

/**
 * Fetches all runs from the server
 * @returns A promise containing the response from the server
 */
export const getAllRuns = (): Promise<Response> => {
  return fetch(urls.getAllRuns);
};
