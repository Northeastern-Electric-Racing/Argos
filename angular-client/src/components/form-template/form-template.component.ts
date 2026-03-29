/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, OnInit, effect, inject, input, output } from '@angular/core';
import { FormBuilder, FormGroup, ValidatorFn, Validators, ReactiveFormsModule } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';
import { NgClass, NgIf } from '@angular/common';
import { ButtonDirective } from 'primeng/button';

type anyType = string | number | boolean | undefined;

export interface DynamicFormField {
  type: string; // 'text', 'dropdown', 'checkbox', etc.
  name: string; // FormControl name
  label: string; // Label text
  placeholder?: string; // Placeholder text
  optionLabel?: string; // Option label
  optionValue?: string; // Option value
  // options?: any[]; // Dropdown options, etc.
  validation?: ValidatorFn[]; // Validators
  disabled: boolean; // Disabled state
  required?: boolean; // Is field required
  pattern?: string; // Pattern validation
  maxLength?: number; // Maximum length
  minLength?: number; // Minimum length
}

@Component({
  selector: 'form-template',
  templateUrl: './form-template.component.html',
  styleUrl: './form-template.component.css',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, NgClass, NgIf, ButtonDirective]
})
export class FormTemplateComponent implements OnInit {
  public config = inject(DynamicDialogConfig);

  fields = input.required<DynamicFormField[]>();

  public ref = inject(DynamicDialogRef);

  formData = input<Map<string, anyType>>(new Map());
  submitForm = output<FormGroup>();

  form: FormGroup = this.fb.group({});

  constructor(private fb: FormBuilder) {
    effect(() => {
      // Re-read signals to track changes
      this.fields();
      this.formData();
      this.buildForm();
    });
  }

  ngOnInit(): void {
    this.buildForm();
  }

  buildForm() {
    const group: any = {};

    this.fields().forEach((field) => {
      const control = this.fb.control({
        value: this.formData() ? this.formData().get(field.name) : '',
        disabled: field.disabled
      });

      const validations = [];

      if (field.required) validations.push(Validators.required);
      if (field.pattern) validations.push(Validators.pattern(field.pattern));
      if (field.maxLength) validations.push(Validators.maxLength(field.maxLength));
      if (field.minLength) validations.push(Validators.minLength(field.minLength));

      control.setValidators(validations);
      if (field.optionValue !== undefined) {
        control.setValue(field.optionValue);
      }

      group[field.name] = control;
    });

    this.form = this.fb.group(group);
  }

  closeForm() {
    this.ref.close(this.form);
  }

  onSubmit() {
    if (this.form.valid) {
      this.closeForm();
    } else {
      this.markAllFieldsAsTouched();
    }
  }

  markAllFieldsAsTouched() {
    Object.keys(this.form.controls).forEach((field) => {
      const control = this.form.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  getErrorMessage(field: DynamicFormField) {
    const control = this.form.get(field.name);
    if (control?.hasError('required')) {
      return `${field.label} is required`;
    } else if (control?.hasError('pattern')) {
      return `Invalid ${field.label}`;
    } else if (control?.hasError('maxlength')) {
      return `${field.label} exceeds maximum length of ${field.maxLength}`;
    } else if (control?.hasError('minlength')) {
      return `${field.label} must be at least ${field.minLength} characters long`;
    }
    return '';
  }

  resetForm() {
    this.form.reset();
  }
}
