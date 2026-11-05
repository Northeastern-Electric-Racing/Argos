import { urls } from './urls';

export const getLaps = (runId: number, trackId: number): Promise<Response> => {
  return fetch(urls.getLaps(runId, trackId));
};
