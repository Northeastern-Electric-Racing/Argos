import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastService } from 'src/ui/toast/toast.service';
import { buttonClass } from 'src/ui/recipes/button';
import { ToastButtonComponent } from './toast-button.component';

describe('ToastButtonComponent', () => {
  let fixture: ComponentFixture<ToastButtonComponent>;
  let add: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    add = vi.fn();
    await TestBed.configureTestingModule({
      imports: [ToastButtonComponent],
      providers: [{ provide: ToastService, useValue: { add } }]
    }).compileComponents();
    fixture = TestBed.createComponent(ToastButtonComponent);
    fixture.componentRef.setInput('buttonLabel', 'Save');
    fixture.componentRef.setInput('onClick', () => undefined);
    fixture.detectChanges();
  });

  const button = (): HTMLButtonElement => fixture.nativeElement.querySelector('button');

  // Angular's [class] binding may reorder classes, so compare them as sorted sets.
  const sorted = (classes: string): string[] => [...new Set(classes.split(/\s+/).filter(Boolean))].sort();

  it('uses the same button recipe as argos-button, at lg', () => {
    expect(sorted(button().className)).toEqual(sorted(buttonClass('primary', 'lg')));
    fixture.componentRef.setInput('variant', 'neutral');
    fixture.detectChanges();
    expect(sorted(button().className)).toEqual(sorted(buttonClass('neutral', 'lg')));
    expect(button().dataset['variant']).toBe('neutral');
  });

  it('runs the action, then confirms it with a toast', async () => {
    const onClick = vi.fn();
    fixture.componentRef.setInput('onClick', onClick);
    fixture.componentRef.setInput('popUpTitle', 'Saved');
    fixture.detectChanges();
    button().click();
    expect(onClick).toHaveBeenCalledTimes(1);
    await new Promise((resolve) => setTimeout(resolve));
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Saved' }));
  });
});
