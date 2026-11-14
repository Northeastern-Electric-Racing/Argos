import { urls } from './urls';

export const getTrace = (runId: number): Promise<Response> => {
  return fetch(urls.getTrace(runId));
};
