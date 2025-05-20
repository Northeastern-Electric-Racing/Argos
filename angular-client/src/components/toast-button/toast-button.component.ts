import { Component, OnInit, inject, input } from '@angular/core';
import { MessageService } from 'primeng/api';

export type toastSeverity = 'success' | 'info' | 'warn' | 'error';

@Component({
    selector: 'toast-button',
    templateUrl: './toast-button.component.html',
    styleUrls: ['./toast-button.component.css'],
    standalone: true
})
export class ToastButtonComponent implements OnInit {
  private messageService = inject(MessageService);
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
