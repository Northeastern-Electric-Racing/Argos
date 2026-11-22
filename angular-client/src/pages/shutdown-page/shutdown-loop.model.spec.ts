import { SHUTDOWN_LOOP } from './shutdown-loop.model';
import { SHUTDOWN_TOPICS } from './shutdown-page.topics';

describe('SHUTDOWN_LOOP', () => {
  it('has 19 nodes in spec order', () => {
    expect(SHUTDOWN_LOOP.map((n) => n.id)).toEqual([
      'glvms',
      'side-brb-r',
      'side-brb-l',
      'bms-latch',
      'imd-latch',
      'bspd-latch',
      'can-latch',
      'mc-hvil',
      'bots',
      'inertia',
      'cockpit-brb',
      'tsms',
      'hvd',
      'em-interlock',
      'acc-sense',
      'tsip-sense',
      'ts-minus',
      'ts-plus',
      'airs'
    ]);
  });

  it('measured nodes have a board', () => {
    for (const node of SHUTDOWN_LOOP) {
      expect(node.topic === undefined)
        .withContext(node.id)
        .toBe(node.board === undefined);
    }
  });

  it('has 14 measured nodes and excludes BMS/Shutdown/State', () => {
    const topics = SHUTDOWN_LOOP.filter((n) => n.topic).map((n) => n.topic);
    expect(topics.length).toBe(14);
    expect(topics).not.toContain(SHUTDOWN_TOPICS.BMS.State);
  });

  it('only em-interlock is placeholder', () => {
    expect(SHUTDOWN_LOOP.filter((n) => n.placeholder).map((n) => n.id)).toEqual(['em-interlock']);
  });

  it('car coords within 0-100', () => {
    for (const { id, car } of SHUTDOWN_LOOP) {
      expect(car.x >= 0 && car.x <= 100 && car.y >= 0 && car.y <= 100)
        .withContext(id)
        .toBeTrue();
    }
  });
});
