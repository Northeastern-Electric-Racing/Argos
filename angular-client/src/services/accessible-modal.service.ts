import { Injectable } from '@angular/core';
import { NzSafeAny } from 'ng-zorro-antd/core/types';
import { ModalOptions, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';

let nextTitleId = 0;

/**
 * nz-modal marks its dialog element role="dialog", but gives it no aria-modal and no accessible name, and a
 * confirm is announced like any other dialog. This NzModalService adds aria-modal, names the dialog after its
 * title, and makes confirms (modal.confirm, info, warning and so on) role="alertdialog".
 * main.ts provides it in place of NzModalService, so callers inject NzModalService as usual.
 */
@Injectable()
export class AccessibleModalService extends NzModalService {
  override create<T, D = NzSafeAny, R = NzSafeAny>(config: ModalOptions<T, D, R>): NzModalRef<T, R> {
    const ref = super.create(config);
    const dialog = ref.getElement();
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', config.nzModalType === 'confirm' ? 'alertdialog' : 'dialog');
    if (typeof config.nzTitle === 'string') {
      dialog.setAttribute('aria-label', config.nzTitle);
    } else {
      // A template title only renders with the modal, so link it once the modal is open.
      ref.afterOpen.subscribe(() => {
        const title = dialog.querySelector('.ant-modal-title, .ant-modal-confirm-title');
        if (!title) return;
        title.id ||= `modal-title-${nextTitleId++}`;
        dialog.setAttribute('aria-labelledby', title.id);
      });
    }
    return ref;
  }
}
