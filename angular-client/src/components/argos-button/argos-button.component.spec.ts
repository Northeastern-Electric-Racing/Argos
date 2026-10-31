import { ComponentFixture, TestBed } from '@angular/core/testing';

import { buttonClass, ButtonComponent } from './argos-button.component';

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

  const button = (): HTMLButtonElement => fixture.nativeElement.querySelector('button');

  it('renders a primary design-system button at the legacy 140x45 footprint by default', () => {
    expect(button().className).toBe('ui-button ui-button--lg');
  });

  it('renders the compact size without the legacy footprint', () => {
    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();
    expect(button().className).toBe('ui-button ui-button--sm');
  });

  it('maps each variant to its design-system modifier', () => {
    fixture.componentRef.setInput('variant', 'tonal');
    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();
    expect(button().className).toBe('ui-button ui-button--sm ui-button--tonal');
  });

  it('applies additionalStyles for layout tweaks', () => {
    fixture.componentRef.setInput('additionalStyles', 'width: 100%;');
    fixture.detectChanges();
    expect(button().style.width).toBe('100%');
  });

  it('disables the native button', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    expect(button().disabled).toBe(true);
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
    expect(received instanceof Event).toBe(true);
  });

  it('buttonClass gives primary the plain button and other variants their modifier', () => {
    expect(buttonClass('primary', 'lg')).toBe('ui-button ui-button--lg');
    expect(buttonClass('danger', 'sm')).toBe('ui-button ui-button--sm ui-button--danger');
  });

  it('reports an on/off toggle through aria-pressed, and leaves it off plain buttons', () => {
    expect(button().hasAttribute('aria-pressed')).toBe(false);
    fixture.componentRef.setInput('ariaPressed', true);
    fixture.detectChanges();
    expect(button().getAttribute('aria-pressed')).toBe('true');
  });
});
