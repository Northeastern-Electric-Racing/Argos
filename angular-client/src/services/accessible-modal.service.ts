import { afterNextRender, inject, Injectable, Injector } from '@angular/core';
import { NzSafeAny } from 'ng-zorro-antd/core/types';
import { ModalOptions, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';

let nextId = 0;

/**
 * nz-modal marks its dialog element role="dialog", but gives it no aria-modal and no accessible name, and a
 * confirm is announced like any other dialog. This NzModalService adds aria-modal, names the dialog by its
 * title element, and makes confirms (modal.confirm, info, warning and so on) role="alertdialog", described by
 * their message. main.ts provides it in place of NzModalService, so callers inject NzModalService as usual.
 */
@Injectable()
export class AccessibleModalService extends NzModalService {
  private readonly renderInjector = inject(Injector);

  override create<T, D = NzSafeAny, R = NzSafeAny>(config: ModalOptions<T, D, R>): NzModalRef<T, R> {
    const ref = super.create(config);
    const dialog = ref.getElement();
    const isConfirm = config.nzModalType === 'confirm';
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', isConfirm ? 'alertdialog' : 'dialog');
    // Point at the rendered title and message, so the name follows the title if it changes.
    const link = () => {
      linkTo(dialog, 'aria-labelledby', '.ant-modal-title, .ant-modal-confirm-title');
      if (isConfirm) linkTo(dialog, 'aria-describedby', '.ant-modal-confirm-content');
    };
    // The header and body render with the modal's first change detection, before its open animation.
    afterNextRender(link, { injector: this.renderInjector });
    return ref;
  }
}

/** Sets attribute on dialog to the id of its first element matching selector, giving that element an id. */
function linkTo(dialog: HTMLElement, attribute: string, selector: string): void {
  const target = dialog.querySelector(selector);
  if (!target || !target.textContent?.trim()) return;
  target.id ||= `argos-modal-${nextId++}`;
  dialog.setAttribute(attribute, target.id);
}
