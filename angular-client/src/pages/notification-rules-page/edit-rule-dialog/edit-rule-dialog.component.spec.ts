import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { EditRuleDialogComponent } from './edit-rule-dialog.component';

describe('EditRuleDialogComponent', () => {
  let fixture: ComponentFixture<EditRuleDialogComponent>;
  let close: ReturnType<typeof vi.fn>;

  const input = (id: string): HTMLInputElement => fixture.nativeElement.querySelector(`#${id}`);

  beforeEach(async () => {
    close = vi.fn();
    await TestBed.configureTestingModule({
      imports: [EditRuleDialogComponent],
      providers: [
        { provide: DynamicDialogRef, useValue: { close } },
        { provide: DynamicDialogConfig, useValue: { data: { expr: 'a > 1', debounce_time: 5, description: 'Old' } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EditRuleDialogComponent);
    fixture.detectChanges();
  });

  it('pre-fills the current description', () => {
    expect(input('edit-description').value).toBe('Old');
  });

  it('returns the edited description on save', () => {
    const description = input('edit-description');
    description.value = 'New';
    description.dispatchEvent(new Event('input'));

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(close).toHaveBeenCalledWith({ expr: 'a > 1', debounce_time: 5, description: 'New' });
  });
});
