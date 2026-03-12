import { Component, computed, inject, input } from '@angular/core';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import TypographyComponent from '../typography/typography.component';
import VStackComponent from '../vstack/vstack.component';

@Component({
  selector: 'messages-per-second',
  templateUrl: './messages-per-second.component.html',
  styleUrl: './messages-per-second.component.css',
  imports: [TypographyComponent, VStackComponent],
  standalone: true
})
export class MessagesPerSecondComponent {
  small = input<boolean>(false);
  messagesPerSecond: number | undefined = undefined;
  private storageService = inject(Storage);

  constructor() {
    this.storageService.get(topics.msgsPerSecond()).subscribe((data) => {
      const [firstValue] = data.values;
      this.messagesPerSecond = parseInt(firstValue);
    });
  }

  additionalStyles = computed(() => {
    return this.small() ? 'fontSize: 12px; color: gray;' : 'fontSize: 15px; color: gray;';
  });

  getDisplayNumber = () => {
    return this.messagesPerSecond !== undefined ? this.messagesPerSecond.toString() : 'N/A';
  };
  getDisplaySubheader = () => {
    return ' Msgs/Sec';
  };
}
