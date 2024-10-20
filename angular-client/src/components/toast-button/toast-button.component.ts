import { Component, Input } from '@angular/core';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'toast-button',
  templateUrl: './toast-button.component.html',
  styleUrls: ['./toast-button.component.css']
})
export class ToastButtonComponent {
  @Input() label!: string;
  @Input() onClick!: () => void;
  @Input() additionalStyles?: string;
  style!: string;

  ngOnInit(): void {
    this.style = 'width: 140px; height: 45px; ';

    if (this.additionalStyles) {
      this.style += this.additionalStyles;
    }
  }

  constructor(private messageService: MessageService) {}

  showSuccess() {
    setTimeout(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'Success!',
        detail: 'Your new run has started successfully.'
      });
    });
  }
}
