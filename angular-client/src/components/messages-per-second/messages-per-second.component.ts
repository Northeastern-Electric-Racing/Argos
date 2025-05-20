import { Component, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import TypographyComponent from '../typography/typography.component';
import VStackComponent from '../vstack/vstack.component';

@Component({
    selector: 'messages-per-second',
    templateUrl: './messages-per-second.component.html',
    styleUrl: './messages-per-second.component.css',
    imports: [TypographyComponent, VStackComponent],
    standalone: true,
})
export class MessagesPerSecondComponent {
  messagesPerSecond: number | undefined = undefined;
  private storageService = inject(Storage);

  constructor() {
    this.storageService.get(topics.msgsPerSecond()).subscribe((data) => {
      const [firstValue] = data.values;
      this.messagesPerSecond = parseInt(firstValue);
    });
  }

  getDisplayNumber = () => {
    return this.messagesPerSecond !== undefined ? this.messagesPerSecond.toString() : 'N/A';
  };
  getDisplaySubheader = () => {
    return ' Msgs/Sec';
  };
}
