import { RuleNotificationTracker } from './socket.service';
import { RuleNotification } from 'src/utils/types.utils';

describe('RuleNotificationTracker', () => {
  const notification = (seq: number, stream = 'run-0'): RuleNotification => ({
    stream,
    seq,
    id: 'rule',
    topic: 'BMS/Pack/SoC',
    values: [1],
    time: '2026-10-23T00:00:00Z'
  });

  it('reports nothing received before any notification', () => {
    const tracker = new RuleNotificationTracker(() => {});

    expect(tracker.checkIn()).toEqual({ stream: null, last_seq: 0 });
  });

  it('adds notifications and reports the last one received in order', () => {
    const add = jasmine.createSpy('add');
    const tracker = new RuleNotificationTracker(add);

    tracker.receive(notification(1));
    tracker.receive(notification(2));

    expect(add).toHaveBeenCalledTimes(2);
    expect(tracker.checkIn()).toEqual({ stream: 'run-0', last_seq: 2 });
  });

  it('skips resent notifications it already added', () => {
    const add = jasmine.createSpy('add');
    const tracker = new RuleNotificationTracker(add);

    tracker.receive(notification(1));
    tracker.receive(notification(1));

    expect(add).toHaveBeenCalledTimes(1);
  });

  it('reports only up to a gap, then past it once the gap is filled', () => {
    const add = jasmine.createSpy('add');
    const tracker = new RuleNotificationTracker(add);

    tracker.receive(notification(1));
    tracker.receive(notification(3));
    expect(tracker.checkIn().last_seq).toBe(1);

    tracker.receive(notification(2));
    tracker.receive(notification(3));
    expect(tracker.checkIn().last_seq).toBe(3);
    expect(add).toHaveBeenCalledTimes(3);
  });

  it('starts over on a new stream', () => {
    const add = jasmine.createSpy('add');
    const tracker = new RuleNotificationTracker(add);

    tracker.receive(notification(1, 'run-0'));
    tracker.receive(notification(2, 'run-0'));
    tracker.receive(notification(1, 'run-1'));

    expect(add).toHaveBeenCalledTimes(3);
    expect(tracker.checkIn()).toEqual({ stream: 'run-1', last_seq: 1 });
  });

  it('does not count a notification it failed to add, so it is resent', () => {
    const add = jasmine.createSpy('add').and.throwError('boom');
    const tracker = new RuleNotificationTracker(add);

    expect(() => tracker.receive(notification(1))).toThrowError('boom');
    expect(tracker.checkIn().last_seq).toBe(0);

    add.and.stub();
    tracker.receive(notification(1));
    expect(add).toHaveBeenCalledTimes(2);
    expect(tracker.checkIn().last_seq).toBe(1);
  });
});
