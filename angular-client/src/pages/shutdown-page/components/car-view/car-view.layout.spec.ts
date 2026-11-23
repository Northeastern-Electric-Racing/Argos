import { SHUTDOWN_LOOP } from '../../shutdown-loop.model';
import { CAR_BADGE_2D, CAR_BADGE_PX, CAR_DRAWING_SM_PX } from './car-view.layout';

describe('car view layout', () => {
  it('has a badge for every loop node, and none for anything else', () => {
    for (const n of SHUTDOWN_LOOP) expect(CAR_BADGE_2D[n.id], n.id).toBeTruthy();
    expect(Object.keys(CAR_BADGE_2D).sort()).toEqual(SHUTDOWN_LOOP.map((n) => n.id).sort());
  });

  it(`keeps every pair of badge centres at least ${CAR_BADGE_PX} px apart in a 600 x 321 px drawing`, () => {
    const px = (id: string) => ({
      x: (CAR_BADGE_2D[id].x / 100) * CAR_DRAWING_SM_PX.width,
      y: (CAR_BADGE_2D[id].y / 100) * CAR_DRAWING_SM_PX.height
    });
    const ids = SHUTDOWN_LOOP.map((n) => n.id);
    const close: string[] = [];
    ids.forEach((a, i) =>
      ids.slice(i + 1).forEach((b) => {
        const d = Math.hypot(px(a).x - px(b).x, px(a).y - px(b).y);
        if (d < CAR_BADGE_PX) close.push(`${a}–${b}: ${d.toFixed(1)} px`);
      })
    );
    expect(close).toEqual([]);
  });

  it('keeps every badge inside the drawing', () => {
    const r = (CAR_BADGE_PX / 2 / CAR_DRAWING_SM_PX.width) * 100;
    const ry = (CAR_BADGE_PX / 2 / CAR_DRAWING_SM_PX.height) * 100;
    for (const { x, y } of Object.values(CAR_BADGE_2D)) {
      expect(x).toBeGreaterThanOrEqual(r);
      expect(x).toBeLessThanOrEqual(100 - r);
      expect(y).toBeGreaterThanOrEqual(ry);
      expect(y).toBeLessThanOrEqual(100 - ry);
    }
  });
});
