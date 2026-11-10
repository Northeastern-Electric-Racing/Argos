import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { UploadConfirmDialogComponent } from './upload-confirm-dialog.component';

describe('UploadConfirmDialogComponent', () => {
  const rules = [
    { id: 'hot', topic: 'BMS/Pack/Voltage', expr: 'a > 400', debounce_time: 5 },
    { id: 'cold', topic: 'BMS/Status/Temp_Average', expr: 'a < 0', debounce_time: 60 }
  ];

  const setup = async () => {
    const close = vi.fn();
    await TestBed.configureTestingModule({
      imports: [UploadConfirmDialogComponent],
      providers: [
        { provide: DialogRef, useValue: { close } },
        { provide: DIALOG_DATA, useValue: { rules } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(UploadConfirmDialogComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const button = (label: string): HTMLButtonElement =>
      Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === label
      )!;
    return { fixture, close, button };
  };

  it('lists every parsed rule in a table, one row each, under column headers', async () => {
    const { fixture } = await setup();
    const headers = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('th')).map((th) =>
      th.textContent?.trim()
    );
    expect(headers).toEqual(['ID', 'Topic', 'Expression', 'Debounce (s)']);
    const rows = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('tbody tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.trim())
    );
    expect(rows).toEqual([
      ['hot', 'BMS/Pack/Voltage', 'a > 400', '5'],
      ['cold', 'BMS/Status/Temp_Average', 'a < 0', '60']
    ]);
    expect(fixture.nativeElement.textContent).toContain('The following 2 rule(s) will be added');
  });

  it('puts the preview in a labelled region the keyboard can scroll, as its rows can outgrow it', async () => {
    const { fixture } = await setup();
    const region: HTMLElement = fixture.nativeElement.querySelector('[role="region"]');
    expect(region.contains(fixture.nativeElement.querySelector('table'))).toBe(true);
    expect(region.tabIndex).toBe(0);
    expect(region.getAttribute('aria-label')).toBe('Rules to add');
  });

  it('lets a topic break only after a slash, so a phone-width column never splits a word', async () => {
    const { fixture } = await setup();
    const [, topic] = fixture.nativeElement
      .querySelectorAll('tbody tr')[1]
      .querySelectorAll('td') as NodeListOf<HTMLElement>;
    expect(topic.textContent).toBe('BMS/Status/Temp_Average');
    expect(topic.querySelectorAll('wbr').length).toBe(3);
  });

  it('closes with true to upload, false to cancel', async () => {
    const { close, button } = await setup();
    button('Confirm Upload').click();
    expect(close).toHaveBeenLastCalledWith(true);
    button('Cancel').click();
    expect(close).toHaveBeenLastCalledWith(false);
  });
});
