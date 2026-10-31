import { TestBed } from '@angular/core/testing';
import { ConfirmService } from './confirm.service';

describe('ConfirmService', () => {
  const dialog = () => document.querySelector<HTMLElement>('[role="alertdialog"]');
  const button = (label: string) =>
    Array.from(dialog()!.querySelectorAll('button')).find((b) => b.textContent?.trim() === label)!;
  const settle = () => TestBed.inject(ConfirmService) && new Promise((resolve) => setTimeout(resolve));

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = '')));

  it('opens an alert dialog labelled by its header and described by its message', async () => {
    TestBed.inject(ConfirmService).confirm({ header: 'Delete Rule', message: 'Delete rule "hot"?' });
    await settle();
    const el = dialog()!;
    const describedBy = el.getAttribute('aria-describedby')!;
    expect(document.getElementById(describedBy)?.textContent).toBe('Delete rule "hot"?');
    expect(document.getElementById(el.getAttribute('aria-labelledby')!)?.textContent).toBe('Delete Rule');
    // The least destructive choice takes initial focus (checked in the browser; the test DOM has no layout).
    expect(button('No').hasAttribute('cdkFocusInitial')).toBe(true);
  });

  it('calls accept on the accept button and reject on the reject button', async () => {
    const accept = vi.fn();
    const reject = vi.fn();
    const service = TestBed.inject(ConfirmService);

    service.confirm({ message: 'Sure?', acceptLabel: 'Delete', rejectLabel: 'Cancel', danger: true, accept, reject });
    await settle();
    expect(button('Delete').classList).toContain('ui-button--danger');
    button('Delete').click();
    await settle();
    expect(accept).toHaveBeenCalledTimes(1);
    expect(reject).not.toHaveBeenCalled();

    service.confirm({ message: 'Sure?', rejectLabel: 'Cancel', accept, reject });
    await settle();
    button('Cancel').click();
    await settle();
    expect(reject).toHaveBeenCalledTimes(1);
    expect(accept).toHaveBeenCalledTimes(1);
  });
});
