import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientRule } from 'src/api/rules.api';
import { RulesTableComponent } from './rules-table.component';

const rule = (isSubscribed: boolean): ClientRule => ({
  id: 'r1',
  topic: 'BMS/Pack/Voltage',
  expr: 'a > 60',
  debounce_time: 5,
  subscribers: [],
  is_subscribed: isSubscribed
});

describe('RulesTableComponent', () => {
  let fixture: ComponentFixture<RulesTableComponent>;
  let toggleResponse: Response;
  let serverSubscribed: boolean;

  const mountWith = async (isSubscribed: boolean): Promise<HTMLInputElement> => {
    serverSubscribed = isSubscribed;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('subscribe')) return toggleResponse;
      return new Response(JSON.stringify({ requesting_client_id: 'c1', client_rules: [rule(serverSubscribed)] }));
    });

    fixture = TestBed.createComponent(RulesTableComponent);
    fixture.componentRef.setInput('clientId', 'c1');
    fixture.detectChanges();
    const input = await vi.waitFor(() => {
      const found = fixture.nativeElement.querySelector('input[aria-label="Subscribe to rule r1"]');
      if (!found) throw new Error('rule row not rendered yet');
      return found as HTMLInputElement;
    });
    await fixture.whenStable();
    return input;
  };

  const toggle = async (input: HTMLInputElement): Promise<void> => {
    input.click();
    // Let the request settle, then NgModel's write-back (it writes on a microtask)
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RulesTableComponent] }).compileComponents();
  });

  afterEach(() => vi.restoreAllMocks());

  it('keeps the switch on when the request succeeds', async () => {
    toggleResponse = new Response('', { status: 200 });
    const input = await mountWith(false);

    await toggle(input);

    expect(input.checked).toBe(true);
    expect(fixture.componentInstance.rules()[0].is_subscribed).toBe(true);
  });

  it('turns the switch back off when subscribing fails', async () => {
    toggleResponse = new Response('nope', { status: 500 });
    const input = await mountWith(false);
    expect(input.checked).toBe(false);

    await toggle(input);

    expect(input.checked).toBe(false);
    expect(fixture.componentInstance.rules()[0].is_subscribed).toBe(false);
  });

  it('turns the switch back on when unsubscribing fails', async () => {
    toggleResponse = new Response('nope', { status: 500 });
    const input = await mountWith(true);
    expect(input.checked).toBe(true);

    await toggle(input);

    expect(input.checked).toBe(true);
    expect(fixture.componentInstance.rules()[0].is_subscribed).toBe(true);
  });

  it('still shows a later server state after a failed toggle', async () => {
    toggleResponse = new Response('nope', { status: 500 });
    const input = await mountWith(false);
    await toggle(input);

    // Subscribed elsewhere, then the table reloads
    serverSubscribed = true;
    await fixture.componentInstance.loadRules();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();

    expect(input.checked).toBe(true);
  });
});
