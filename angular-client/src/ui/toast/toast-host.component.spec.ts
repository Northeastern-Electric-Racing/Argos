import { LiveAnnouncer } from '@angular/cdk/a11y';
import { TestBed } from '@angular/core/testing';
import { ToastHostComponent } from './toast-host.component';
import { ToastService, ToastSeverity } from './toast.service';

describe('ToastHostComponent', () => {
  const setup = async () => {
    TestBed.configureTestingModule({ providers: [{ provide: LiveAnnouncer, useValue: { announce: vi.fn() } }] });
    const fixture = TestBed.createComponent(ToastHostComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.autoDetectChanges();
    const service = TestBed.inject(ToastService);
    const toasts = () => [...fixture.nativeElement.querySelectorAll('[data-severity]')] as HTMLElement[];
    return { fixture, service, toasts };
  };

  afterEach(() => TestBed.inject(ToastService).clear());

  it('stacks one toast per message, newest last, with its severity, summary and detail', async () => {
    const { fixture, service, toasts } = await setup();
    const severities: ToastSeverity[] = ['success', 'info', 'warn', 'error'];
    severities.forEach((severity) =>
      service.add({ severity, summary: severity, detail: `${severity} detail`, sticky: true })
    );
    await fixture.whenStable();
    expect(toasts().map((t) => t.dataset['severity'])).toEqual(severities);
    expect(toasts()[3].textContent).toContain('error detail');
  });

  it('dismisses a toast from its named close button', async () => {
    const { fixture, service, toasts } = await setup();
    service.add({ summary: 'Saved', sticky: true });
    await fixture.whenStable();
    const close = toasts()[0].querySelector<HTMLButtonElement>('button[aria-label="Dismiss notification"]')!;
    expect(close).not.toBeNull();
    close.click();
    await fixture.whenStable();
    expect(toasts()).toEqual([]);
  });

  it('never takes focus from what the user is doing', async () => {
    const { fixture, service } = await setup();
    const field = document.createElement('input');
    document.body.appendChild(field);
    field.focus();
    service.add({ severity: 'error', summary: 'Failed', sticky: true });
    await fixture.whenStable();
    expect(document.activeElement).toBe(field);
    field.remove();
  });

  it('hides the decorative severity icon from assistive tech (the service announces the text)', async () => {
    const { fixture, service, toasts } = await setup();
    service.add({ severity: 'warn', summary: 'Careful', sticky: true });
    await fixture.whenStable();
    const icons = [...toasts()[0].querySelectorAll('ui-icon')];
    expect(icons.every((icon) => icon.getAttribute('aria-hidden') === 'true')).toBe(true);
  });
});
