import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import Storage from 'src/services/storage.service';
import { DataValue } from 'src/utils/socket.utils';
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
export class TopicLiveValueComponent {
  topic = input.required<string>();
  precision = input(3);

  private storage = inject(Storage);
  protected value = signal('N/A');

  constructor() {
    // A plain subscription per row rather than a toObservable/switchMap chain: flat mode renders ~900 of these.
    effect((onCleanup) => {
      const topic = this.topic();
      const precision = this.precision();
      const show = (value: DataValue) => this.value.set(formatLiveValue(value, precision));
      // eslint-disable-next-line rxjs-angular-x/prefer-takeuntil -- the effect's cleanup unsubscribes on topic change and on destroy
      const subscription = this.storage.get(topic).subscribe(show);
      onCleanup(() => subscription.unsubscribe());
    });
  }
}
