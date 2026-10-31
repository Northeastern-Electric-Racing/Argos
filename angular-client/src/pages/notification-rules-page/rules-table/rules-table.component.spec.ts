import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RulesTableComponent } from './rules-table.component';

describe('RulesTableComponent: phone layout', () => {
  const rules = [
    { id: 'r1', topic: 'BMS/Status/Temp_Average', expr: 'a > 60', debounce_time: 5, subscribers: [], is_subscribed: true }
  ];

  const render = async (phone: boolean) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify({ requesting_client_id: 'me', client_rules: rules }))))
    );
    TestBed.configureTestingModule({
      imports: [RulesTableComponent],
      providers: [
        {
          provide: BreakpointObserver,
          useValue: { observe: () => of({ matches: phone, breakpoints: {} } as BreakpointState) }
        }
      ]
    });
    const fixture = TestBed.createComponent(RulesTableComponent);
    fixture.componentRef.setInput('clientId', 'me');
    fixture.detectChanges();
    // loadRules awaits fetch and then response.json()
    await vi.waitFor(() => expect(fixture.componentInstance.loading()).toBe(false));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  afterEach(() => vi.unstubAllGlobals());

  // At 390px the checkbox, Subscribed and both row actions must fit without scrolling the table sideways
  it('narrows the checkbox and actions columns and lets long topics wrap on phones', async () => {
    const el = await render(true);
    const headers = el.querySelectorAll<HTMLElement>('thead th');

    expect(headers[0].style.width).toBe('2.5rem');
    expect(headers[headers.length - 1].style.width).toBe('4rem');
    const [expr, topic] = el.querySelectorAll<HTMLElement>('tbody td.wrap-anywhere');
    expect(expr.textContent!.trim()).toBe('a > 60');
    // Break opportunities after each slash, with no stray spaces in the topic
    expect(topic.textContent!.trim()).toBe('BMS/Status/Temp_Average');
    expect(topic.querySelectorAll('wbr').length).toBe(3);
  });

  it('keeps the roomier desktop columns', async () => {
    const el = await render(false);
    const headers = el.querySelectorAll<HTMLElement>('thead th');

    expect(headers[0].style.width).toBe('3rem');
    expect(headers[headers.length - 1].style.width).toBe('5rem');
  });
});
