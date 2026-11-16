import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import Storage from 'src/services/storage.service';
import { DataValue } from 'src/utils/socket.utils';
import EfuseCardComponent, { EfuseLockMode } from './efuse-card.component';

/** Storage at its boundary: one subject per topic, so a spec can publish Calypso's state. */
class FakeStorage {
  private subjects = new Map<string, Subject<DataValue>>();
  get = (key: string): Subject<DataValue> => {
    if (!this.subjects.has(key)) this.subjects.set(key, new Subject<DataValue>());
    return this.subjects.get(key)!;
  };
  publish(key: string, value: string) {
    this.get(key).next({ values: [value], time: '0', unit: '' } as unknown as DataValue);
  }
}

describe('EfuseCardComponent', () => {
  let storage: FakeStorage;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    storage = new FakeStorage();
    TestBed.configureTestingModule({ providers: [{ provide: Storage, useValue: storage }] });
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
  });
  afterEach(() => vi.restoreAllMocks());

  const setup = async (lockMode: EfuseLockMode, name = 'Shutdown') => {
    const fixture = TestBed.createComponent(EfuseCardComponent);
    fixture.componentRef.setInput('efuseName', name);
    fixture.componentRef.setInput('efuseTopicKey', name);
    fixture.componentRef.setInput('commandKey', name);
    fixture.componentRef.setInput('maxCurrent', '1');
    fixture.componentRef.setInput('lockMode', lockMode);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const group = () => host.querySelector<HTMLElement>('[role="group"]')!;
    const position = (name: string) =>
      Array.from(group().querySelectorAll('button')).find((b) => b.textContent?.trim() === name)!;
    const pressed = () =>
      Array.from(group().querySelectorAll('button[aria-pressed="true"]')).map((b) => b.textContent?.trim());
    const lock = () => host.querySelector<HTMLButtonElement>(`button[aria-label="Lock ${name}"]`);
    return { fixture, host, group, position, pressed, lock };
  };

  it('names the switch after its eFuse', async () => {
    const { group } = await setup(EfuseLockMode.Unlocked, 'Brake');
    expect(group().getAttribute('aria-label')).toBe('Brake mode');
  });

  it("follows Calypso's state", async () => {
    const { fixture, pressed } = await setup(EfuseLockMode.Unlocked, 'Brake');
    storage.publish('Calypso/Bidir/State/eFuses/Brake', '0');
    await fixture.whenStable();
    expect(pressed()).toEqual(['ON']);
  });

  describe('a caution card (unlock to edit)', () => {
    it('gates its switch behind a pressed lock', async () => {
      const { position, lock } = await setup(EfuseLockMode.UnlockToEdit);
      expect(lock()?.getAttribute('aria-pressed')).toBe('true');
      expect(position('ON').disabled).toBe(true);
      position('ON').click();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('sends one command once unlocked, locks again and moves focus to the lock', async () => {
      const { fixture, position, lock } = await setup(EfuseLockMode.UnlockToEdit);
      lock()!.click();
      await fixture.whenStable();
      expect(lock()!.getAttribute('aria-pressed')).toBe('false');
      expect(position('ON').disabled).toBe(false);

      position('ON').focus();
      position('ON').click();
      await fixture.whenStable();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(String(fetchSpy.mock.calls[0][0])).toContain('/config/set/Shutdown?data=0');
      expect(lock()!.getAttribute('aria-pressed')).toBe('true');
      expect(position('OFF').disabled).toBe(true);
      // The pressed button is disabled under it: focus goes to the lock, never to <body>.
      expect(document.activeElement).toBe(lock());
    });
  });

  describe('a normal card (unlocked)', () => {
    it('has no lock and sends straight away', async () => {
      const { fixture, position, lock } = await setup(EfuseLockMode.Unlocked, 'Brake');
      expect(lock()).toBeNull();
      position('ON').click();
      await fixture.whenStable();
      expect(String(fetchSpy.mock.calls[0][0])).toContain('/config/set/Brake?data=0');
      expect(position('ON').disabled).toBe(false);
    });

    it('shows the new position at once and reverts it when the command fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      let fail!: (r: Response) => void;
      fetchSpy.mockReturnValue(new Promise<Response>((resolve) => (fail = resolve)));
      const { fixture, position, pressed } = await setup(EfuseLockMode.Unlocked, 'Brake');
      position('ON').click();
      await fixture.whenStable();
      expect(pressed()).toEqual(['ON']);

      fail(new Response(null, { status: 500 }));
      await new Promise((r) => setTimeout(r));
      await fixture.whenStable();
      expect(pressed()).toEqual(['OFF']);
    });
  });
});
