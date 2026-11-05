import { createRuleNotifyHandler } from './socket.service';
import { RuleNotification } from 'src/utils/types.utils';

describe('createRuleNotifyHandler', () => {
  const notification = (notificationId: string): RuleNotification => ({
    notification_id: notificationId,
    id: 'rule',
    topic: 'BMS/Pack/SoC',
    values: [1],
    time: '2026-10-22T00:00:00Z'
  });

  it('adds the notification to the log and acks it', () => {
    const add = jasmine.createSpy('add');
    const ack = jasmine.createSpy('ack');
    const handle = createRuleNotifyHandler(add);

    handle(notification('1'), ack);

    expect(add).toHaveBeenCalledOnceWith(notification('1'));
    expect(ack).toHaveBeenCalledTimes(1);
  });

  it('acks a resent duplicate without adding it again', () => {
    const add = jasmine.createSpy('add');
    const ack = jasmine.createSpy('ack');
    const handle = createRuleNotifyHandler(add);

    handle(notification('1'), ack);
    handle(notification('1'), ack);

    expect(add).toHaveBeenCalledTimes(1);
    expect(ack).toHaveBeenCalledTimes(2);
  });

  it('adds distinct notifications of the same rule', () => {
    const add = jasmine.createSpy('add');
    const handle = createRuleNotifyHandler(add);

    handle(notification('1'), () => {});
    handle(notification('2'), () => {});

    expect(add).toHaveBeenCalledTimes(2);
  });

  it('does not ack when adding fails, so the server resends it', () => {
    const add = jasmine.createSpy('add').and.throwError('boom');
    const ack = jasmine.createSpy('ack');
    const handle = createRuleNotifyHandler(add);

    expect(() => handle(notification('1'), ack)).toThrowError('boom');
    expect(ack).not.toHaveBeenCalled();
  });

  it('adds a notification again after a failed add', () => {
    const add = jasmine.createSpy('add').and.throwError('boom');
    const handle = createRuleNotifyHandler(add);

    expect(() => handle(notification('1'), () => {})).toThrowError('boom');
    add.and.stub();
    handle(notification('1'), () => {});

    expect(add).toHaveBeenCalledTimes(2);
  });
});
