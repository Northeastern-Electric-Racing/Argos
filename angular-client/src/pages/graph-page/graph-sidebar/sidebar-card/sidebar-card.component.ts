import { Component, Input, OnInit } from '@angular/core';

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
export default class SidebarCard implements OnInit {
  @Input() title!: string;
  @Input() dropDown?: boolean;
  @Input() open?: boolean;
  @Input() dataValue?: string;
  @Input() selected: boolean = false;
  iconId!: string;

  ngOnInit(): void {
    this.iconId = `${this.title}-icon`;
  }
  /**
   * Runs animation when card is selected
   */
  selectCard() {
    // const card = document.getElementById(this.title);
    // if (card) {
    //   card.classList.add('selected');
    //   setTimeout(() => {
    //     card.classList.remove('selected');
    //   }, 250);
    // }
    // const dropDown = document.getElementById(this.iconId);
    // if (dropDown) {
    //   dropDown.classList.toggle('selected');
    // }
  }
}
