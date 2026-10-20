import { Component, OnInit, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { ToastService } from 'src/services/toast.service';

export type toastSeverity = 'success' | 'info' | 'warn' | 'error';

@Component({
  selector: 'toast-button',
  templateUrl: './toast-button.component.html',
  styleUrls: ['./toast-button.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class ToastButtonComponent implements OnInit {
  private messageService = inject(ToastService);
  buttonLabel = input.required<string>();
  popUpSeverity = input<toastSeverity>('success');
  popUpTitle = input<string>('Success!');
  popUpDetails = input<string>('No Details Set');
  disableToast = input<boolean>(false);

  onClick = input.required<() => void>();
  additionalStyles = input<string>('');
  style = 'width: 140px; height: 45px;';

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
      this.messageService.add({
        severity: this.popUpSeverity(),
        summary: this.popUpTitle(),
        detail: this.popUpDetails()
      });
    });
  }
}
