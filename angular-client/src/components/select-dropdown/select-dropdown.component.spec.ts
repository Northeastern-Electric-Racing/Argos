import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectDropdownComponent } from './select-dropdown.component';

describe('SelectDropdownComponent', () => {
  let component: SelectDropdownComponent;
  let fixture: ComponentFixture<SelectDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectDropdownComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SelectDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  const name = () => fixture.nativeElement.querySelector('[role=combobox]').getAttribute('aria-label');

  it('names its select by ariaLabel, its purpose, whatever the placeholder says', () => {
    fixture.componentRef.setInput('placeholder', 'C Volts');
    fixture.componentRef.setInput('ariaLabel', 'Segment 3 heat map view');
    fixture.detectChanges();
    expect(name()).toBe('Segment 3 heat map view');
  });

  it('falls back to the placeholder as the name without an ariaLabel', () => {
    fixture.componentRef.setInput('placeholder', 'Select a preset');
    fixture.detectChanges();
    expect(name()).toBe('Select a preset');
  });
});
