import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormTemplateComponent } from './form-template.component';

describe('FormTemplateComponent', () => {
  let component: FormTemplateComponent;
  let fixture: ComponentFixture<FormTemplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormTemplateComponent],
      providers: [
        { provide: DIALOG_DATA, useValue: {} },
        { provide: DialogRef, useValue: { close: () => {} } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FormTemplateComponent);
    component = fixture.componentInstance;
    // fields is a required input consumed by ngOnInit -> buildForm.
    fixture.componentRef.setInput('fields', []);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('labels each input and links its error message', () => {
    fixture.componentRef.setInput('fields', [
      { type: 'text', name: 'driver', label: 'Driver', disabled: false, required: true }
    ]);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector<HTMLInputElement>('#form-field-driver')!;
    expect(el.querySelector('label')!.getAttribute('for')).toBe('form-field-driver');
    expect(input.getAttribute('aria-required')).toBe('true');
    expect(input.hasAttribute('aria-describedby')).toBe(false);

    component.form.get('driver')!.setValue('');
    component.form.get('driver')!.markAsTouched();
    fixture.detectChanges();

    expect(input.getAttribute('aria-invalid')).toBe('true');
    const error = el.querySelector('#' + input.getAttribute('aria-describedby'))!;
    expect(error.textContent).toContain('Driver is required');
  });
});
