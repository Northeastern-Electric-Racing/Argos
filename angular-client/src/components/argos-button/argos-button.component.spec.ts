import { ComponentFixture, TestBed } from '@angular/core/testing';

import { buttonClass } from 'src/ui/recipes/button';
import { ButtonComponent } from './argos-button.component';

// Angular's [class] binding may reorder classes, so compare them as sorted sets.
const sorted = (classes: string): string[] => [...new Set(classes.split(/\s+/).filter(Boolean))].sort();

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

  const classes = (): string[] => sorted(button().className);

  it('renders a primary button from the recipe at the legacy 140x45 footprint (lg) by default', () => {
    expect(classes()).toEqual(sorted(buttonClass('primary', 'lg')));
    expect(button().dataset['variant']).toBe('primary');
    expect(button().dataset['size']).toBe('lg');
  });

  it('renders the compact size without the legacy footprint', () => {
    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();
    expect(classes()).toEqual(sorted(buttonClass('primary', 'sm')));
  });

  it('maps each variant to its recipe', () => {
    fixture.componentRef.setInput('variant', 'tonal');
    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();
    expect(classes()).toEqual(sorted(buttonClass('tonal', 'sm')));
    expect(button().dataset['variant']).toBe('tonal');
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

  it('reports an on/off toggle through aria-pressed, and leaves it off plain buttons', () => {
    expect(button().hasAttribute('aria-pressed')).toBe(false);
    fixture.componentRef.setInput('ariaPressed', true);
    fixture.detectChanges();
    expect(button().getAttribute('aria-pressed')).toBe('true');
  });
});
