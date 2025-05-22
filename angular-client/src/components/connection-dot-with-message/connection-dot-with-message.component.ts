import { Component, input } from '@angular/core';
import TypographyComponent from '../typography/typography.component';
import HStackComponent from '../hstack/hstack.component';

@Component({
  selector: 'connection-dot-with-message',
  templateUrl: './connection-dot-with-message.component.html',
  styleUrl: './connection-dot-with-message.component.css',
  imports: [TypographyComponent, HStackComponent],
  standalone: true
})
export class ConnectionDotWithMessageComponent {
  getStatusColor = input.required<() => string>();
  getStatusMessage = input<() => string>((): string => {
    return '';
  });
}
