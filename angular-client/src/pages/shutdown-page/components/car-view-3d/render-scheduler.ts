/**
 * Renders on demand: any number of requests before the next animation frame make one frame, and frames continue
 * only while the render reports motion (orbit damping settling). Idle, it schedules nothing.
 */
export class RenderScheduler {
  private handle = 0;
  private stopped = false;

  constructor(
    /** Draws one frame; returns true while something is still moving and needs another frame. */
    private readonly render: () => boolean,
    private readonly raf: (cb: FrameRequestCallback) => number = (cb) => requestAnimationFrame(cb),
    private readonly cancel: (handle: number) => void = (h) => cancelAnimationFrame(h)
  ) {}

  /** Whether a frame is scheduled. */
  get pending(): boolean {
    return this.handle !== 0;
  }

  request(): void {
    if (this.handle || this.stopped) return;
    this.handle = this.raf(() => {
      this.handle = 0;
      if (this.stopped) return;
      if (this.render()) this.request();
    });
  }

  stop(): void {
    this.stopped = true;
    if (this.handle) this.cancel(this.handle);
    this.handle = 0;
  }
}
