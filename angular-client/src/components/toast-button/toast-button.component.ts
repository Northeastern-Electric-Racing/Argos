import { Component, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { ToastService } from 'src/services/toast.service';
import { TuiButton, type TuiSizeL, type TuiSizeS } from '@taiga-ui/core';

export type toastSeverity = 'success' | 'info' | 'warn' | 'error';

// Taiga notification appearances for each severity
const APPEARANCE: Record<toastSeverity, string> = {
  success: 'positive',
  info: 'info',
  warn: 'warning',
  error: 'negative'
};

@Component({
  selector: 'toast-button',
  templateUrl: './toast-button.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [TuiButton]
})
export class ToastButtonComponent {
  private toasts = inject(ToastService);
  buttonLabel = input.required<string>();
  popUpSeverity = input<toastSeverity>('success');
  popUpTitle = input<string>('Success!');
  popUpDetails = input<string>('No Details Set');
  disableToast = input<boolean>(false);

  onClick = input.required<() => void>();
  size = input<TuiSizeS | TuiSizeL>('m');
  appearance = input<string>('primary');

  handleClick() {
    // the first () is to access the signal value,
    // which is the function which we call with the second ()
    this.onClick()();
    // if the toast is disabled, we don't want to show it
    if (this.disableToast()) return;
    setTimeout(() => {
      this.toasts.show(this.popUpDetails(), { label: this.popUpTitle(), appearance: APPEARANCE[this.popUpSeverity()] });
    });
  }
}
