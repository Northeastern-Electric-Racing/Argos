import { TestBed } from '@angular/core/testing';
import { ClientRule, RulesResponse } from 'src/api/rules.api';
import { RulesTableComponent } from './rules-table.component';

describe('RulesTableComponent', () => {
  const rule: ClientRule = {
    id: 'high-voltage',
    topic: 'BMS/Pack/Voltage',
    expr: 'a > 5.0',
    debounce_time: 60,
    subscribers: [],
    is_subscribed: false
  };

  beforeEach(() => {
    const body: RulesResponse = { requesting_client_id: 'client', client_rules: [rule] };
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify(body))))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders icon-only edit and delete buttons on each row', async () => {
    await TestBed.configureTestingModule({ imports: [RulesTableComponent] }).compileComponents();
    const fixture = TestBed.createComponent(RulesTableComponent);
    fixture.componentRef.setInput('clientId', 'client');
    const host = fixture.nativeElement as HTMLElement;
    // loadRules awaits fetch + json outside Angular's task tracking, so poll until the row renders.
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(host.querySelector('button[aria-label="Edit rule"]')).toBeTruthy();
    });

    const edit = host.querySelector('button[aria-label="Edit rule"]');
    const del = host.querySelector('button[aria-label="Delete rule"]');
    expect(edit?.querySelector('.pi.pi-pencil')).toBeTruthy();
    expect(del?.querySelector('.pi.pi-trash')).toBeTruthy();
    expect(edit?.classList).toContain('p-button-icon-only');
    expect(del?.classList).toContain('p-button-icon-only');
  });
});
