import { urls } from './urls';

export const sendConfig = (key: string, values: number[]): Promise<Response> => {
  return fetch(urls.carCommandConfig(key, values), { method: 'POST' });
};

export const authenticatePw = (password: string) => {
  const body = { password };
  return fetch(urls.authenticate(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
};
