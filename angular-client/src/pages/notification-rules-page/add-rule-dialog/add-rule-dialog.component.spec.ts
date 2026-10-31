import { DialogRef } from '@angular/cdk/dialog';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddRuleDialogComponent } from './add-rule-dialog.component';

describe('AddRuleDialogComponent', () => {
  let fixture: ComponentFixture<AddRuleDialogComponent>;
  let close: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // The topic list is fetched on init; keep it pending so the test is offline.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {}))
    );
    close = vi.fn();
    await TestBed.configureTestingModule({
      imports: [AddRuleDialogComponent],
      providers: [{ provide: DialogRef, useValue: { close } }]
    }).compileComponents();
    fixture = TestBed.createComponent(AddRuleDialogComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  afterEach(() => vi.unstubAllGlobals());

  const input = (id: string): HTMLInputElement => fixture.nativeElement.querySelector(`#${id}`);
  const fields = ['rule-id', 'rule-topic', 'rule-expr', 'rule-debounce'];

  it('marks every field required, and none invalid before they are touched', () => {
    for (const id of fields) {
      expect(input(id).getAttribute('aria-required')).toBe('true');
      expect(input(id).hasAttribute('aria-invalid')).toBe(false);
      expect(input(id).hasAttribute('aria-describedby')).toBe(false);
    }
  });

  it('points each invalid field at its error message on submit', async () => {
    fixture.componentInstance.form.controls.debounce_time.setValue(-1);
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    await fixture.whenStable();

    expect(close).not.toHaveBeenCalled();
    const messages: Record<string, string> = {
      'rule-id': 'Rule ID is required',
      'rule-topic': 'Topic is required',
      'rule-expr': 'Expression is required',
      'rule-debounce': 'Must be 0 or greater'
    };
    for (const id of fields) {
      expect(input(id).getAttribute('aria-invalid')).toBe('true');
      expect(document.getElementById(input(id).getAttribute('aria-describedby')!)?.textContent?.trim()).toBe(messages[id]);
    }
  });
});
