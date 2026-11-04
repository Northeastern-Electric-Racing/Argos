import { RecentIds, createRuleNotifyHandler } from './socket.service';
import { RuleNotification } from 'src/utils/types.utils';

describe('createRuleNotifyHandler', () => {
  const notification = (notificationId: string): RuleNotification => ({
    notification_id: notificationId,
    id: 'rule',
    topic: 'BMS/Pack/SoC',
    values: [1],
    time: '2026-10-29T00:00:00Z'
  });

  it('adds the notification to the log and acks it', () => {
    const add = vi.fn();
    const ack = vi.fn();
    const handle = createRuleNotifyHandler(add);

    handle(notification('1'), ack);

    expect(add).toHaveBeenCalledExactlyOnceWith(notification('1'));
    expect(ack).toHaveBeenCalledOnce();
  });

  it('acks a resent duplicate without adding it again', () => {
    const add = vi.fn();
    const ack = vi.fn();
    const handle = createRuleNotifyHandler(add);

    handle(notification('1'), ack);
    handle(notification('1'), ack);

    expect(add).toHaveBeenCalledOnce();
    expect(ack).toHaveBeenCalledTimes(2);
  });

  it('does not ack when adding fails, so the server resends it', () => {
    const add = vi.fn<(notification: RuleNotification) => void>().mockImplementation(() => {
      throw new Error('boom');
    });
    const ack = vi.fn();
    const handle = createRuleNotifyHandler(add);

    expect(() => handle(notification('1'), ack)).toThrowError('boom');
    expect(ack).not.toHaveBeenCalled();

    add.mockImplementation(() => undefined);
    handle(notification('1'), ack);
    expect(add).toHaveBeenCalledTimes(2);
    expect(ack).toHaveBeenCalledOnce();
  });
});

describe('RecentIds', () => {
  it('remembers ids it was given', () => {
    const ids = new RecentIds(10);
    ids.add('a');

    expect(ids.has('a')).toBe(true);
    expect(ids.has('b')).toBe(false);
  });

  it('forgets the oldest ids in a batch once past capacity', () => {
    const ids = new RecentIds(4, 2);
    ['a', 'b', 'c', 'd', 'e'].forEach((id) => ids.add(id));

    expect(['a', 'b'].map((id) => ids.has(id))).toEqual([false, false]);
    expect(['c', 'd', 'e'].map((id) => ids.has(id))).toEqual([true, true, true]);
    expect(ids.size).toBe(3);
  });
});
