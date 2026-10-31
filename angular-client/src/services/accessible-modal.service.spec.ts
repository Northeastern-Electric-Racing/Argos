import { TestBed } from '@angular/core/testing';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';

describe('AccessibleModalService', () => {
  let modal: NzModalService;
  let ref: NzModalRef | undefined;

  const textOf = (id: string | null) => (id ? document.getElementById(id)?.textContent?.trim() : undefined);

  beforeEach(() => {
    modal = TestBed.inject(NzModalService);
  });

  afterEach(() => ref?.destroy());

  it('marks a modal as a modal dialog named by its title', async () => {
    ref = modal.create({ nzTitle: 'Edit Run', nzContent: 'Body', nzFooter: null });
    const dialog = ref.getElement();
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    await vi.waitFor(() => expect(textOf(dialog.getAttribute('aria-labelledby'))).toBe('Edit Run'));
    expect(dialog.hasAttribute('aria-describedby')).toBe(false);
  });

  it('marks a confirm as an alert dialog named by its title and described by its message', async () => {
    ref = modal.confirm({ nzTitle: 'Delete Rule', nzContent: 'Delete rule "r1"?' });
    const dialog = ref.getElement();
    expect(dialog.getAttribute('role')).toBe('alertdialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    await vi.waitFor(() => {
      expect(textOf(dialog.getAttribute('aria-labelledby'))).toBe('Delete Rule');
      expect(textOf(dialog.getAttribute('aria-describedby'))).toBe('Delete rule "r1"?');
    });
  });
});
