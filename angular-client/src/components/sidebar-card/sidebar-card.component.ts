import { Component, Input } from '@angular/core';

@Component({
  selector: 'sidebar-card',
  templateUrl: './sidebar-card.component.html',
  styleUrls: ['./sidebar-card.component.css']
})
export default class SidebarCard {
  @Input() title!: string;
  @Input() subtitle?: string;

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
