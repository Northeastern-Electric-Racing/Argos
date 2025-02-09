import { Component, inject, Input, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { decimalPipe } from 'src/utils/pipes.utils';

/**
 * Sidebar Card Component to display a card in the sidebar.
 * @param title The title of the card.
 * @param subtitle The subtitle of the card.
 */
@Component({
  selector: 'sidebar-card',
  templateUrl: './sidebar-card.component.html',
  styleUrls: ['./sidebar-card.component.css']
})
export default class SidebarCardComponent implements OnInit {
  private storage = inject(Storage);

  @Input() title!: string;
  @Input() dropDown?: boolean;
  @Input() open?: boolean;
  @Input() dataValue?: string;
  @Input() topicName!: string;
  @Input() isDesktop: boolean = true;
  iconId!: string;

  ngOnInit(): void {
    this.iconId = `${this.title}-icon`;

    this.storage.get(this.topicName.slice(0, -1)).subscribe((value) => {
      const displayValue = decimalPipe(value.values[0], 3).toFixed(3) + value.unit;
      this.dataValue = displayValue;
    });
  }

  /**
   * Runs animation when card is selected
   */
  selectCard() {
    const card = document.getElementById(this.title);
    if (card) {
      card.classList.add('selected');
      setTimeout(() => {
        card.classList.remove('selected');
      }, 250);
    }
    const dropDown = document.getElementById(this.iconId);
    if (dropDown) {
      dropDown.classList.toggle('selected');
    }
  }
}
