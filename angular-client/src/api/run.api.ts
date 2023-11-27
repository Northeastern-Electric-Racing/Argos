import { urls } from './urls';

/**
 * Fetches the run with the given id
 * @param id The id of the run to request
 * @returns The requested run
 */
export const getRunById = (id: number) => {
  return fetch(urls.getRunById(id));
};
