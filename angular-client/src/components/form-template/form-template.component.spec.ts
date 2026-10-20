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
});
