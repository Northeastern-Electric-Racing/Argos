import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import Storage from 'src/services/storage.service';
import RtdsDebugCardComponent from './rtds-debug-card.component';

describe('RtdsDebugCardComponent', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: Storage, useValue: { get: () => new Subject() } }] });
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
  });
  afterEach(() => vi.restoreAllMocks());

  const setup = async () => {
    const fixture = TestBed.createComponent(RtdsDebugCardComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const command = (name: string) =>
      Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.trim() === name)!;
    const commands = () => ['Sound RTDS', 'Cancel RTDS', 'Start Reverse', 'Stop Reverse'].map(command);
    const lock = () => host.querySelector<HTMLButtonElement>('button[aria-label="Lock RTDS commands"]')!;
    return { fixture, host, command, commands, lock };
  };

  it('gates the one-shot commands behind a pressed lock', async () => {
    const { commands, lock } = await setup();
    expect(lock().getAttribute('aria-pressed')).toBe('true');
    expect(commands().every((b) => b.disabled && b.type === 'button')).toBe(true);
  });

  it('sends one command once unlocked, locks again and moves focus to the lock', async () => {
    const { fixture, command, commands, lock } = await setup();
    lock().click();
    await fixture.whenStable();
    expect(commands().some((b) => b.disabled)).toBe(false);

    command('Start Reverse').focus();
    command('Start Reverse').click();
    await fixture.whenStable();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).toContain('/config/set/RTDSCommand?data=2');
    expect(lock().getAttribute('aria-pressed')).toBe('true');
    expect(commands().every((b) => b.disabled)).toBe(true);
    expect(document.activeElement).toBe(lock());
  });

  it('says whether shutdown is closed', async () => {
    const { host } = await setup();
    expect(host.textContent).toContain('SHUTDOWN CLOSED, off');
  });
});
