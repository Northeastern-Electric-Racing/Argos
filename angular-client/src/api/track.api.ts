import { Track } from 'src/utils/types.utils';
import { urls } from './urls';

export const getAllTracks = (): Promise<Response> => {
  return fetch(urls.getAllTracks());
};

export const addTrack = (name: string): Promise<Response> => {
  return fetch(urls.addTrack(), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
};

export const editTrack = ({ id, startLine, finishLine }: Track): Promise<Response> => {
  return fetch(urls.editTrack(id), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startLine, finishLine })
  });
};

export const deleteTrack = (id: number): Promise<Response> => {
  return fetch(urls.deleteTrack(id), { method: 'POST' });
};
