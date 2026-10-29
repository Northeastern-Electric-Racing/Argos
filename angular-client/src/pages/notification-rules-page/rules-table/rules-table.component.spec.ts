import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { RulesResponse } from 'src/api/rules.api';
import { RulesTableComponent } from './rules-table.component';

describe('RulesTableComponent', () => {
  let fixture: ComponentFixture<RulesTableComponent>;

  const response: RulesResponse = {
    requesting_client_id: 'me',
    client_rules: [
      {
        id: 'described',
        topic: 'BMS/Pack/Voltage',
        expr: 'a > 5',
        debounce_time: 60,
        description: 'Pack overvoltage',
        uploaded_by: 'client-abc',
        subscribers: ['client-abc'],
        is_subscribed: true
      },
      {
        id: 'bare',
        topic: 'VCU/CarState/speed',
        expr: 'a > 100',
        debounce_time: 5,
        description: null,
        uploaded_by: null,
        subscribers: [],
        is_subscribed: false
      }
    ]
  };

  const cells = (row: number): string[] =>
    Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('tbody tr')[row].querySelectorAll('td')).map((td) =>
      td.textContent!.trim()
    );

  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(response))));

    await TestBed.configureTestingModule({
      imports: [RulesTableComponent],
      providers: [MessageService, DialogService]
    }).compileComponents();

    fixture = TestBed.createComponent(RulesTableComponent);
    fixture.componentRef.setInput('clientId', 'me');
    fixture.detectChanges();
    // loadRules awaits fetch outside Angular's knowledge, so wait for the rows to render
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('shows uploaded by and description', () => {
    expect(cells(0).slice(1, 5)).toEqual(['a > 5', 'BMS/Pack/Voltage', 'client-abc', 'Pack overvoltage']);
  });

  it('shows a dash when uploaded by or description is missing', () => {
    expect(cells(1).slice(3, 5)).toEqual(['-', '-']);
  });
});
