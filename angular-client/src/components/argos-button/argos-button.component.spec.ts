import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ButtonComponent } from './argos-button.component';

describe('ButtonComponent', () => {
  let component: ButtonComponent;
  let fixture: ComponentFixture<ButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'Test');
    fixture.componentRef.setInput('onClick', () => {});
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('defaults to btn btn--default class and includes legacy width/height', () => {
    expect(component.cssClass()).toBe('btn btn--default');
    expect(component.style()).toContain('width: 140px');
    expect(component.style()).toContain('height: 45px');
  });

  it('omits legacy width/height when size is sm', () => {
    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();
    expect(component.cssClass()).toBe('btn btn--sm');
    expect(component.style()).not.toContain('width: 140px');
    expect(component.style()).not.toContain('height: 45px');
  });

  it('appends additionalStyles after the size-driven base', () => {
    fixture.componentRef.setInput('size', 'sm');
    fixture.componentRef.setInput('additionalStyles', 'background-color: red;');
    fixture.detectChanges();
    expect(component.style()).toContain('background-color: red;');
  });

  it('passes the click event to the onClick handler (popover triggers depend on this)', () => {
    let received: Event | undefined;
    fixture.componentRef.setInput('onClick', (e?: Event) => {
      received = e;
    });
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    button.click();
    expect(received).toBeDefined();
    expect(received instanceof Event).toBeTrue();
  });
});
