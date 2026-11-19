import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, map, switchMap } from 'rxjs';
import Storage from 'src/services/storage.service';
import { formatTopicValue } from 'src/utils/tree.utils';
import { OnScreenObserver } from './on-screen-observer.service';

/**
 * A sidebar row's live value. It reads its topic from Storage only while the row is on screen, and lets go when
 * the row scrolls out of the sidebar or its branch collapses, so the graph page reads a screenful of topics, not
 * all of them. Coming back, it starts from the topic's latest value (Storage.watch), so the row never blinks N/A.
 */
@Component({
  selector: 'topic-value',
  templateUrl: './topic-value.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopicValueComponent {
  topic = input.required<string>();
  precision = input(3);

  private storage = inject(Storage);
  private onScreen = signal(false);
  private liveTopic = computed(() => (this.onScreen() ? this.topic() : undefined));

  protected value = toSignal(
    toObservable(this.liveTopic).pipe(
      switchMap((topic) => (topic ? this.storage.watch(topic) : EMPTY)),
      map((value) => formatTopicValue(value, this.precision()))
    ),
    { initialValue: 'N/A' }
  );

  constructor() {
    const host: HTMLElement = inject(ElementRef).nativeElement;
    const screen = inject(OnScreenObserver);
    const destroyRef = inject(DestroyRef);
    let stop = (): void => undefined;
    destroyRef.onDestroy(() => stop());
    afterNextRender(() => (stop = screen.observe(host, (onScreen) => this.onScreen.set(onScreen))));
  }
}
