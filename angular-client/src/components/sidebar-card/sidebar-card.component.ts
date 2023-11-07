import { Component, Input } from '@angular/core';

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
export default class SidebarCard {
  @Input() title!: string;
  @Input() subtitle?: string;

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
  }
}
