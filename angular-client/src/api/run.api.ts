import { urls } from './urls';

/**
 * Fetches all runs from the server
 * @returns A promise containing the response from the server
 */
export const getAllRuns = (): Promise<Response> => {
  return fetch(urls.getAllRuns);
};

/**
 * Fetches the run with the given id
 * @param id The id of the run to request
 * @returns The requested run
 */
export const getRunById = (id: number) => {
  return fetch(urls.getRunById(id));
};
