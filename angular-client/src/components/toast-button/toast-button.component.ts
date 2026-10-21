import { Component, OnInit, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { ToastService } from 'src/services/toast.service';
import { TuiButton } from '@taiga-ui/core';

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
  styleUrls: ['./toast-button.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [TuiButton]
})
export class ToastButtonComponent implements OnInit {
  private toasts = inject(ToastService);
  buttonLabel = input.required<string>();
  popUpSeverity = input<toastSeverity>('success');
  popUpTitle = input<string>('Success!');
  popUpDetails = input<string>('No Details Set');
  disableToast = input<boolean>(false);

  onClick = input.required<() => void>();
  additionalStyles = input<string>('');
  style = 'width: 140px;';

  ngOnInit(): void {
    this.style += this.additionalStyles();
  }

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
