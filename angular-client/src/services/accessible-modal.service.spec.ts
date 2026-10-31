import { TestBed } from '@angular/core/testing';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';

describe('AccessibleModalService', () => {
  let modal: NzModalService;
  let ref: NzModalRef | undefined;

  beforeEach(() => {
    modal = TestBed.inject(NzModalService);
  });

  afterEach(() => ref?.destroy());

  it('marks a modal as a modal dialog named by its title', () => {
    ref = modal.create({ nzTitle: 'Edit Run', nzContent: 'Body', nzFooter: null });
    const dialog = ref.getElement();
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Edit Run');
  });

  it('marks a confirm as an alert dialog', () => {
    ref = modal.confirm({ nzTitle: 'Delete Rule', nzContent: 'Delete rule "r1"?' });
    const dialog = ref.getElement();
    expect(dialog.getAttribute('role')).toBe('alertdialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Delete Rule');
  });
});
