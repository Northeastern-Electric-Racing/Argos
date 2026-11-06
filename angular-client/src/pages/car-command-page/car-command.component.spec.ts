import { ComponentFixture, TestBed } from '@angular/core/testing';
import CarCommandComponent from './car-command.component';

const json = (body: unknown, ok = true) =>
  Promise.resolve({ ok, statusText: ok ? 'OK' : 'Unauthorized', json: () => Promise.resolve(body) } as Response);

const datatypes = [
  { name: 'Calypso/Bidir/Command/Launch/torque', unit: 'Nm' },
  { name: 'BMS/Pack/Voltage', unit: 'V' }
];
const settings = {
  data_upload_disabled: false,
  batch_upsert_time: 10,
  ratelimit_mode: 1,
  static_ratelimit_time: 100,
  socket_discard_percent: 0
};

/** Waits for the stubbed fetches' promise chains, then renders. */
const settle = async (fixture: ComponentFixture<unknown>) => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
  await fixture.whenStable();
};

describe('CarCommandComponent', () => {
  let fixture: ComponentFixture<CarCommandComponent>;
  let fetchMock: ReturnType<typeof vi.fn<(url: string, init?: RequestInit) => Promise<Response>>>;
  let passwordOk: boolean;
  const el = () => fixture.nativeElement as HTMLElement;
  const button = (label: string, root: ParentNode = document) =>
    Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.trim() === label) as HTMLButtonElement;
  const calls = (part: string) => fetchMock.mock.calls.filter(([url]) => String(url).includes(part));

  const authenticate = async (password: string) => {
    const input = el().querySelector<HTMLInputElement>('input[type=password]')!;
    input.value = password;
    input.dispatchEvent(new Event('input'));
    button('Authenticate', el()).click();
    await settle(fixture);
  };

  beforeEach(async () => {
    passwordOk = true;
    fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/datatypes')) return json(datatypes);
      if (url.endsWith('/scylla/get_settings')) return json(settings);
      if (url.endsWith('/authenticate')) return passwordOk ? json('ok') : json(null, false);
      return json('Command sent');
    });
    vi.stubGlobal('fetch', fetchMock);
    await TestBed.configureTestingModule({ imports: [CarCommandComponent] }).compileComponents();
    fixture = TestBed.createComponent(CarCommandComponent);
    fixture.autoDetectChanges();
    await settle(fixture);
  });

  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
    vi.unstubAllGlobals();
  });

  it('marks the password field invalid and describes it with the error on a wrong password', async () => {
    passwordOk = false;
    await authenticate('wrong');

    const input = el().querySelector<HTMLInputElement>('input[type=password]')!;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const error = document.getElementById(input.getAttribute('aria-describedby')!);
    expect(error?.textContent).toContain('Incorrect password');
  });

  it('shows the commands after authenticating and moves focus into them, not to the body', async () => {
    await authenticate('secret');

    expect(el().querySelector('input[type=password]')).toBeNull();
    expect(el().textContent).toContain('Launch');
    expect(document.activeElement).not.toBe(document.body);
    expect(el().contains(document.activeElement)).toBe(true);
  });

  it('shows no ring on the moved focus after a mouse Authenticate, even after a failed keyboard try', async () => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    // a failed keyboard try first: focus-visible must not carry over to the mouse retry (wave 2 review N3)
    passwordOk = false;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await authenticate('wrong');
    passwordOk = true;
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, buttons: 1, detail: 1 }));
    await authenticate('secret');
    expect(focus).toHaveBeenLastCalledWith(expect.objectContaining({ focusVisible: false }));
    expect(el().contains(document.activeElement)).toBe(true);
    vi.restoreAllMocks();
  });

  describe('sending a command', () => {
    beforeEach(async () => {
      await authenticate('secret');
      const value = el().querySelector<HTMLInputElement>('command-row input')!;
      value.value = '12.5';
      value.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      button('Send Command', el()).focus();
      button('Send Command', el()).click();
      await settle(fixture);
    });

    const dialog = () => document.querySelector('[role=alertdialog]') as HTMLElement | null;

    // Initial focus on Cancel needs layout (the CDK focus trap checks visibility): checked in the browser.
    it('asks for confirmation first, with the command and value', () => {
      expect(dialog()?.getAttribute('aria-describedby')).toBeTruthy();
      expect(dialog()?.textContent).toContain('Send command "Launch" with value 12.5 to the car?');
      expect(calls('/config/set/')).toHaveLength(0);
    });

    it('sends nothing on Cancel and returns focus to Send Command', async () => {
      button('Cancel', dialog()!).click();
      await settle(fixture);

      expect(dialog()).toBeNull();
      expect(calls('/config/set/')).toHaveLength(0);
      expect(document.activeElement).toBe(button('Send Command', el()));
    });

    it('sends the command with its value on Send', async () => {
      button('Send', dialog()!).click();
      await settle(fixture);

      expect(calls('/config/set/').map(([url]) => url)).toEqual([expect.stringContaining('/config/set/Launch?data=12.5')]);
    });
  });
});
