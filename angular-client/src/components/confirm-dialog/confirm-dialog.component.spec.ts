import { TestBed } from '@angular/core/testing';
import { ConfirmService } from 'src/services/confirm.service';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let service: ConfirmService;
  let accept: ReturnType<typeof vi.fn<() => void>>;

  const alertDialog = () => document.querySelector<HTMLElement>('[role="alertdialog"]');
  const button = (label: string) =>
    Array.from(alertDialog()?.querySelectorAll('button') ?? []).find((b) => b.textContent?.trim() === label);

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ConfirmDialogComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    service = TestBed.inject(ConfirmService);
    accept = vi.fn<() => void>();
    service.confirm({ header: 'Delete Rule', message: 'Delete rule r1?', acceptLabel: 'Delete', destructive: true, accept });
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => service.answer(false));

  it('shows the question in an alert dialog', () => {
    expect(alertDialog()?.textContent).toContain('Delete Rule');
    expect(alertDialog()?.textContent).toContain('Delete rule r1?');
  });

  it('runs accept once when the user says yes', () => {
    button('Delete')?.click();
    expect(accept).toHaveBeenCalledTimes(1);
    expect(service.pending()).toBeNull();
  });

  it('does not run accept on cancel', () => {
    button('Cancel')?.click();
    expect(accept).not.toHaveBeenCalled();
    expect(service.pending()).toBeNull();
  });
});
