import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { of } from 'rxjs';
import APIService from 'src/services/api.service';
import { AddRuleDialogComponent } from './add-rule-dialog.component';

describe('AddRuleDialogComponent', () => {
  let fixture: ComponentFixture<AddRuleDialogComponent>;
  let close: ReturnType<typeof vi.fn>;

  const type = (id: string, value: string): void => {
    const el: HTMLInputElement = fixture.nativeElement.querySelector(`#${id}`);
    el.value = value;
    el.dispatchEvent(new Event('input'));
  };

  beforeEach(async () => {
    close = vi.fn();
    await TestBed.configureTestingModule({
      imports: [AddRuleDialogComponent],
      providers: [
        { provide: DynamicDialogRef, useValue: { close } },
        { provide: APIService, useValue: { query: () => ({ data: of([]) }) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AddRuleDialogComponent);
    fixture.detectChanges();
  });

  it('includes the description in the new rule', () => {
    type('rule-id', 'high-voltage');
    fixture.componentInstance.form.controls.topic.setValue('BMS/Pack/Voltage');
    type('rule-expr', 'a > 5');
    type('rule-description', 'Pack overvoltage');

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(close).toHaveBeenCalledWith({
      id: 'high-voltage',
      topic: 'BMS/Pack/Voltage',
      expr: 'a > 5',
      debounce_time: 60,
      description: 'Pack overvoltage'
    });
  });
});
