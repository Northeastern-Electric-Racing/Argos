import { RenderScheduler } from './render-scheduler';

function fakeFrames() {
  const queue = new Map<number, FrameRequestCallback>();
  let next = 1;
  return {
    raf: (cb: FrameRequestCallback) => {
      queue.set(next, cb);
      return next++;
    },
    cancel: (h: number) => queue.delete(h),
    /** Runs the frames scheduled so far; returns how many ran. */
    flush: () => {
      const due = [...queue];
      queue.clear();
      due.forEach(([, cb]) => cb(0));
      return due.length;
    },
    get size() {
      return queue.size;
    }
  };
}

describe('RenderScheduler', () => {
  it('coalesces requests into one frame', () => {
    const frames = fakeFrames();
    const render = vi.fn(() => false);
    const s = new RenderScheduler(render, frames.raf, frames.cancel);
    s.request();
    s.request();
    s.request();
    expect(frames.flush()).toBe(1);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('schedules nothing while idle', () => {
    const frames = fakeFrames();
    new RenderScheduler(() => false, frames.raf, frames.cancel);
    expect(frames.size).toBe(0);
  });

  it('keeps rendering while the render reports motion, then stops', () => {
    const frames = fakeFrames();
    let moving = 3;
    const render = vi.fn(() => moving-- > 0);
    const s = new RenderScheduler(render, frames.raf, frames.cancel);
    s.request();
    while (frames.flush());
    expect(render).toHaveBeenCalledTimes(4);
    expect(s.pending).toBe(false);
  });

  it('cancels a pending frame and ignores requests after stop', () => {
    const frames = fakeFrames();
    const render = vi.fn(() => true);
    const s = new RenderScheduler(render, frames.raf, frames.cancel);
    s.request();
    s.stop();
    s.request();
    expect(frames.flush()).toBe(0);
    expect(render).not.toHaveBeenCalled();
  });
});
