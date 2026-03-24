import { urls } from './urls';

export const startLap = (): Promise<Response> => {
  return fetch(urls.startLap(), { method: 'POST' });
};

export const pauseLap = (): Promise<Response> => {
  return fetch(urls.pauseLap(), { method: 'POST' });
};

export const stopLap = (): Promise<Response> => {
  return fetch(urls.stopLap(), { method: 'POST' });
};

export const getLaps = (): Promise<Response> => {
  return fetch(urls.getLaps());
};
