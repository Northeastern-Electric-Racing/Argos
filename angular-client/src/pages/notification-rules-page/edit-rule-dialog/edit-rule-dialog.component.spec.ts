import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditRuleDialogComponent } from './edit-rule-dialog.component';

describe('EditRuleDialogComponent', () => {
  let fixture: ComponentFixture<EditRuleDialogComponent>;
  let close: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    close = vi.fn();
    await TestBed.configureTestingModule({
      imports: [EditRuleDialogComponent],
      providers: [
        { provide: DialogRef, useValue: { close } },
        { provide: DIALOG_DATA, useValue: { expr: 'a > 1', debounce_time: 5 } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(EditRuleDialogComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  const input = (id: string): HTMLInputElement => fixture.nativeElement.querySelector(`#${id}`);
  const submit = async () => {
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    await fixture.whenStable();
  };

  it('marks its fields required, and not invalid before they are touched', () => {
    expect(input('edit-expr').getAttribute('aria-required')).toBe('true');
    expect(input('edit-expr').hasAttribute('aria-invalid')).toBe(false);
    expect(input('edit-expr').hasAttribute('aria-describedby')).toBe(false);
  });

  it('points an invalid field at its error message', async () => {
    fixture.componentInstance.form.controls.expr.setValue('');
    fixture.componentInstance.form.controls.debounce_time.setValue(-1);
    await submit();

    expect(close).not.toHaveBeenCalled();
    for (const [id, message] of [
      ['edit-expr', 'Expression is required'],
      ['edit-debounce', 'Must be 0 or greater']
    ]) {
      expect(input(id).getAttribute('aria-invalid')).toBe('true');
      expect(document.getElementById(input(id).getAttribute('aria-describedby')!)?.textContent?.trim()).toBe(message);
    }
  });

  it('closes with the edited rule when valid', async () => {
    fixture.componentInstance.form.controls.debounce_time.setValue(9);
    await submit();
    expect(close).toHaveBeenCalledWith({ expr: 'a > 1', debounce_time: 9 });
  });
});
