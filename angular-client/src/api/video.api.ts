import { urls } from './urls';

/**
 * Fetches all videos from the server
 * @returns A promise containing the response from the server
 */
export const getAllVideos = (): Promise<Response> => {
  return fetch(urls.getAllVideos());
};

/**
 * Requests Scylla to update its videos
 * @returns A promise containing the response from scylla
 */
export const updateVideos = (): Promise<Response> => {
  return fetch(urls.updateVideos(), { method: 'POST' });
};
