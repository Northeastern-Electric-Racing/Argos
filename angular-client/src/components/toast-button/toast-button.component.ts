import { ToastService } from 'src/ui/toast/toast.service';
import { Component, inject, input, ChangeDetectionStrategy, computed } from '@angular/core';
import { ButtonVariant } from '../argos-button/argos-button.component';

export type toastSeverity = 'success' | 'info' | 'warn' | 'error';

/** A design-system button that also confirms its action with a toast. */
@Component({
  selector: 'toast-button',
  templateUrl: './toast-button.component.html',
  styleUrls: ['./toast-button.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class ToastButtonComponent {
  private toastService = inject(ToastService);
  buttonLabel = input.required<string>();
  popUpSeverity = input<toastSeverity>('success');
  popUpTitle = input<string>('Success!');
  popUpDetails = input<string>('No Details Set');
  disableToast = input<boolean>(false);
  variant = input<ButtonVariant>('primary');

  onClick = input.required<() => void>();
  /** Layout tweaks only (size, margins); the look comes from `variant`. */
  additionalStyles = input<string>('');
  protected cssClass = computed(() =>
    this.variant() === 'primary' ? 'ui-button ui-button--lg' : `ui-button ui-button--lg ui-button--${this.variant()}`
  );

  handleClick() {
    // the first () is to access the signal value,
    // which is the function which we call with the second ()
    this.onClick()();
    // if the toast is disabled, we don't want to show it
    if (this.disableToast()) return;
    setTimeout(() => {
      this.toastService.add({
        severity: this.popUpSeverity(),
        summary: this.popUpTitle(),
        detail: this.popUpDetails()
      });
    });
  }
}
