import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {
  MAT_SNACK_BAR_DATA,
  MatSnackBarAction,
  MatSnackBarActions,
  MatSnackBarLabel,
  MatSnackBarRef
} from '@angular/material/snack-bar';
import { ToastMessage, ToastSeverity } from 'src/services/toast.service';

const SEVERITY_ICONS: Record<ToastSeverity, string> = {
  success: 'check_circle',
  info: 'info',
  warn: 'warning',
  error: 'error'
};

/** Snackbar content for ToastService: a severity icon, a summary line and optional detail. */
@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon, MatIconButton, MatSnackBarLabel, MatSnackBarActions, MatSnackBarAction]
})
export class ToastComponent {
  protected message = inject<ToastMessage>(MAT_SNACK_BAR_DATA);
  protected snackBarRef = inject(MatSnackBarRef);
  protected icon = SEVERITY_ICONS[this.message.severity];
}
