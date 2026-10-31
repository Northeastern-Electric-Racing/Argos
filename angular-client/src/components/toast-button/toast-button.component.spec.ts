import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastService } from 'src/ui/toast/toast.service';
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

  it('uses the same design-system classes as argos-button', () => {
    expect(button().className).toBe('ui-button ui-button--lg');
    fixture.componentRef.setInput('variant', 'neutral');
    fixture.detectChanges();
    expect(button().className).toBe('ui-button ui-button--lg ui-button--neutral');
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
