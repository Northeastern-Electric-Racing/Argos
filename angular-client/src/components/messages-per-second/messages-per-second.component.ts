import { Component, computed, inject, input, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import TypographyComponent from '../typography/typography.component';
import VStackComponent from '../vstack/vstack.component';

@Component({
  selector: 'messages-per-second',
  templateUrl: './messages-per-second.component.html',
  imports: [TypographyComponent, VStackComponent],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class MessagesPerSecondComponent {
  private destroyRef = inject(DestroyRef);
  small = input<boolean>(false);
  messagesPerSecond: number | undefined = undefined;
  private storageService = inject(Storage);

  constructor() {
    this.storageService
      .get(topics.msgsPerSecond())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        const [firstValue] = data.values;
        this.messagesPerSecond = parseInt(firstValue);
      });
  }

  /** Small, muted text: the rate is chrome next to the clock, not a reading. */
  textClass = computed(() => (this.small() ? 'text-xs text-fg-muted' : 'text-sm text-fg-muted'));

  getDisplayNumber = () => {
    return this.messagesPerSecond !== undefined ? this.messagesPerSecond.toString() : 'N/A';
  };
  getDisplaySubheader = () => {
    return ' Msgs/Sec';
  };
}
