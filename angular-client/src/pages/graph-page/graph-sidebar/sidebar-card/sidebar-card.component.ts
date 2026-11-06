import { Component, OnInit, computed, inject, input, signal, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Storage from 'src/services/storage.service';
import { decimalPipe } from 'src/utils/pipes.utils';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import { tw } from 'src/ui/recipes/tw';

/**
 * Sidebar Card Component to display a card in the sidebar.
 * @param title The title of the card.
 * @param subtitle The subtitle of the card.
 */
@Component({
  selector: 'sidebar-card',
  templateUrl: './sidebar-card.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [UiIconComponent]
})
export default class SidebarCardComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private storage = inject(Storage);

  title = input.required<string>();
  dropDown = input<boolean | undefined>(undefined);
  open = input<boolean | undefined>(undefined);
  dataValue = signal<string | undefined>(undefined);
  topicName = input.required<string>();
  isDesktop = input<boolean>(true);
  iconId = computed(() => `${this.title()}-icon`);
  protected readonly titleWithIcon = tw('my-1.25 ml-8.75');
  protected readonly titleCentred = tw('mx-1.25 text-center');

  ngOnInit(): void {
    this.storage
      .get(this.topicName().slice(0, -1))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const displayValue = decimalPipe(value.values[0], 3).toFixed(3) + value.unit;
        this.dataValue.set(displayValue);
      });
  }

  /**
   * Runs animation when card is selected
   */
  selectCard() {
    const card = document.getElementById(this.title());
    if (card) {
      card.classList.add('selected');
      setTimeout(() => {
        card.classList.remove('selected');
      }, 250);
    }
    const dropDown = document.getElementById(this.iconId());
    if (dropDown) {
      dropDown.classList.toggle('selected');
    }
  }
}
