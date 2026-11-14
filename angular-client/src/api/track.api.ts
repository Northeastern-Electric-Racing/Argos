import { LineKind, TimingLine } from 'src/utils/types.utils';
import { urls } from './urls';

export const addTrack = (name: string): Promise<Response> => {
  return fetch(urls.addTrack(), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
};

export const editTrackLine = (id: number, kind: LineKind, line: TimingLine | null): Promise<Response> => {
  return fetch(urls.editTrackLine(id, kind), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(line)
  });
};

export const deleteTrack = (id: number): Promise<Response> => {
  return fetch(urls.deleteTrack(id), { method: 'POST' });
};
