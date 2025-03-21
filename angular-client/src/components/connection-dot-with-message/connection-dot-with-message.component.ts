import { Component, input } from '@angular/core';

@Component({
  selector: 'connection-dot-with-message',
  templateUrl: './connection-dot-with-message.component.html',
  styleUrl: './connection-dot-with-message.component.css'
})
export class ConnectionDotWithMessageComponent {
  getStatusColor = input.required<() => string>();
  getStatusMessage = input<() => string>((): string => {
    return '';
  });
}
