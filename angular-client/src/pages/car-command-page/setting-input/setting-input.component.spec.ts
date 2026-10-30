import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NzInputNumberComponent } from 'ng-zorro-antd/input-number';
import { By } from '@angular/platform-browser';
import SettingInputComponent from './setting-input.component';

describe('SettingInputComponent', () => {
  let fixture: ComponentFixture<SettingInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SettingInputComponent] }).compileComponents();
    fixture = TestBed.createComponent(SettingInputComponent);
    fixture.componentRef.setInput('label', 'Batch Time (s)');
    fixture.componentRef.setInput('min', 0);
    fixture.componentRef.setInput('max', 3600);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('labels the number input', () => {
    const label: HTMLLabelElement = fixture.nativeElement.querySelector('label');
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(label.textContent!.trim()).toBe('Batch Time (s)');
    expect(label.htmlFor).toBe(input.id);
  });

  it('passes its bounds to nz-input-number, which clamps entered values', () => {
    const inputNumber = fixture.debugElement.query(By.directive(NzInputNumberComponent))
      .componentInstance as NzInputNumberComponent;
    expect(inputNumber.nzMin()).toBe(0);
    expect(inputNumber.nzMax()).toBe(3600);
  });
});
