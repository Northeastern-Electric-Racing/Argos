import { TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { EditRuleDialogComponent } from './edit-rule-dialog.component';

describe('EditRuleDialogComponent', () => {
  it('renders its button labels', async () => {
    await TestBed.configureTestingModule({
      imports: [EditRuleDialogComponent],
      providers: [
        { provide: DynamicDialogConfig, useValue: { data: { expr: 'a > 1', debounce_time: 60 } } },
        { provide: DynamicDialogRef, useValue: { close: () => {} } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(EditRuleDialogComponent);
    fixture.detectChanges();

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['Cancel', 'Save']);
  });
});
