import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Storage from 'src/services/storage.service';
import { formatLiveValue } from 'src/utils/tree.utils';

/**
 * A topic's live value in a topic-tree leaf row. It subscribes to the topic while it exists and unsubscribes when
 * destroyed, so only rendered rows (leaves whose parents are expanded) keep a topic live. Storage replays the topic's
 * latest value on subscribe, so a row that appears on expand shows a value at once rather than N/A until the next message.
 */
@Component({
  selector: 'topic-live-value',
  templateUrl: './topic-live-value.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopicLiveValueComponent implements OnInit {
  /** Fixed for the row's life: the tree tracks rows by topic. */
  topic = input.required<string>();

  private storage = inject(Storage);
  private destroyRef = inject(DestroyRef);
  protected value = signal('N/A');

  ngOnInit(): void {
    this.storage
      .get(this.topic())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.value.set(formatLiveValue(value)));
  }
}
