import { Injectable, Provider, Type } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { take } from 'rxjs';

/**
 * PrimeNG's DialogService with the two things every Argos dialog wants:
 * - Focus goes back to the element that opened the dialog once it closes, instead of to <body>.
 * - Dialogs may fill the viewport on phones; PrimeNG caps them at 90% and has no token for it.
 */
@Injectable()
export class ArgosDialogService extends DialogService {
  override open<T, DataType = unknown, InputValuesType extends Record<string, unknown> = Record<string, unknown>>(
    componentType: Type<T>,
    config: DynamicDialogConfig<DataType, InputValuesType>
  ): DynamicDialogRef<T> | null {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const ref = super.open(componentType, {
      ...config,
      style: { maxWidth: '100%', maxHeight: '100%', ...config.style }
    });
    ref?.onDestroy.pipe(take(1)).subscribe(() => {
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    });
    return ref;
  }
}

/** Provide wherever DialogService is provided, so every injector hands out the Argos version */
export const provideArgosDialogs: Provider = { provide: DialogService, useClass: ArgosDialogService };
