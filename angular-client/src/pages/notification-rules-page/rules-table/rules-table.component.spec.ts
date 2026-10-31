import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationAnnouncerService } from 'src/services/notification-announcer.service';
import { ClientRule } from 'src/api/rules.api';
import { RulesTableComponent } from './rules-table.component';

describe('RulesTableComponent — subscription toggle', () => {
  let fixture: ComponentFixture<RulesTableComponent>;
  let subscribeStatus: number;
  let holdSubscribe: Promise<void> | undefined;

  const rules: ClientRule[] = [
    { id: 'r1', topic: 'a/b', expr: 'x > 1', debounce_time: 0, subscribers: [], is_subscribed: false },
    { id: 'r2', topic: 'c/d', expr: 'y < 2', debounce_time: 0, subscribers: [], is_subscribed: false }
  ];

  beforeEach(async () => {
    subscribeStatus = 200;
    holdSubscribe = undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (!/subscribe/.test(url)) {
          return new Response(JSON.stringify({ requesting_client_id: 'c', client_rules: rules }), { status: 200 });
        }
        await holdSubscribe;
        return new Response('', { status: subscribeStatus });
      })
    );

    await TestBed.configureTestingModule({
      imports: [RulesTableComponent],
      providers: [{ provide: NotificationAnnouncerService, useValue: { create: vi.fn() } }]
    }).compileComponents();

    fixture = TestBed.createComponent(RulesTableComponent);
    fixture.componentRef.setInput('clientId', 'c');
    await settle(() => expect(switches()).toHaveLength(2));
  });

  afterEach(() => vi.unstubAllGlobals());

  /** Re-renders until the assertion holds, since the rules load and the toggle request resolve asynchronously. */
  async function settle(assertion: () => void): Promise<void> {
    await vi.waitFor(() => {
      fixture.detectChanges();
      assertion();
    });
  }

  function switches(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('nz-switch button.ant-switch'));
  }

  function secondSwitch(): HTMLButtonElement {
    return switches()[1];
  }

  async function toggleSecondSwitch(): Promise<void> {
    secondSwitch().click();
    const fetchMock = vi.mocked(fetch);
    await settle(() => expect(fetchMock.mock.calls.some(([url]) => /subscribe/.test(String(url)))).toBe(true));
    // Let the request's response and the component's follow-up update land.
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('keeps the switch on when the subscription succeeds', async () => {
    await toggleSecondSwitch();
    expect(secondSwitch().classList).toContain('ant-switch-checked');
    expect(fixture.componentInstance.rules()[1].is_subscribed).toBe(true);
  });

  it('turns the switch back off when the subscription fails', async () => {
    subscribeStatus = 500;
    await toggleSecondSwitch();
    expect(secondSwitch().classList).not.toContain('ant-switch-checked');
    expect(fixture.componentInstance.rules()[1].is_subscribed).toBe(false);
  });

  it('ignores further clicks on a switch while its request is in flight', async () => {
    let release!: () => void;
    holdSubscribe = new Promise((resolve) => (release = resolve));
    const subscribeCalls = () => vi.mocked(fetch).mock.calls.filter(([url]) => /subscribe/.test(String(url))).length;

    secondSwitch().click();
    await settle(() => expect(secondSwitch().classList).toContain('ant-switch-loading'));
    secondSwitch().click();
    expect(subscribeCalls()).toBe(1);

    release();
    await settle(() => expect(secondSwitch().classList).not.toContain('ant-switch-loading'));
    expect(secondSwitch().classList).toContain('ant-switch-checked');
  });
});
