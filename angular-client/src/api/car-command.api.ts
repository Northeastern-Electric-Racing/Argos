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

export const getSettings = () => {
  return fetch(urls.scyllaSettings());
};

export const toggleUpload = (uploadEnabled: boolean) => {
  if (uploadEnabled) {
    return fetch(urls.enableUpload(), { method: 'PUT' });
  }
  return fetch(urls.disableUpload(), { method: 'PUT' });
};

export const setBatchTime = (batchTime: number) => {
  return fetch(urls.setBatchTime(batchTime), { method: 'PUT' });
};

export const setRateLimitMode = (mode: number) => {
  return fetch(urls.setRateLimitMode(mode), { method: 'PUT' });
};

export const setRateLimitTime = (time: number) => {
  return fetch(urls.setRateLimitTime(time), { method: 'PUT' });
};

export const setDiscardPercentage = (percentage: number) => {
  return fetch(urls.setDiscardPercentage(percentage), { method: 'PUT' });
};
