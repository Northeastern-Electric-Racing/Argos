import { cx, tw } from './tw';

describe('tw and cx', () => {
  it('tw returns its classes unchanged', () => {
    expect(tw('flex gap-2')).toBe('flex gap-2');
  });

  it('cx joins complete lists and skips empty parts', () => {
    expect(cx('flex', '', false, null, undefined, 'gap-2')).toBe('flex gap-2');
  });
});
