import { Component, OnInit, input, ChangeDetectionStrategy } from '@angular/core';
import { showToast, ToastSeverity } from 'src/utils/toast.utils';

export type toastSeverity = ToastSeverity;

@Component({
  selector: 'toast-button',
  templateUrl: './toast-button.component.html',
  styleUrls: ['./toast-button.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class ToastButtonComponent implements OnInit {
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
      showToast(this.popUpSeverity(), this.popUpTitle(), this.popUpDetails());
    });
  }
}
