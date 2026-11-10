import { Subject } from 'rxjs';
import { closeOnEscape } from './close-on-escape';

describe('closeOnEscape', () => {
  const setup = () => {
    const events = new Subject<KeyboardEvent>();
    const close = vi.fn();
    closeOnEscape(events, close);
    return { events, close };
  };

  it('closes on a bare Escape and prevents its default', () => {
    const { events, close } = setup();
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    events.next(event);
    expect(close).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores Escape with a modifier key', () => {
    const { events, close } = setup();
    for (const modifier of ['shiftKey', 'ctrlKey', 'altKey', 'metaKey']) {
      events.next(new KeyboardEvent('keydown', { key: 'Escape', [modifier]: true }));
    }
    expect(close).not.toHaveBeenCalled();
  });

  it('ignores other keys, and leaves their default alone', () => {
    const { events, close } = setup();
    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
    events.next(event);
    expect(close).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});
