import { Component, Input, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { DataType } from 'src/utils/types.utils';

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
  @Input() selectedDataType: Subject<DataType> = new Subject<DataType>();
  iconId!: string;
  selected?: boolean;

  ngOnInit(): void {
    this.iconId = `${this.title}-icon`;
    this.selectedDataType.subscribe((dataType: DataType) => {
      this.selected = this.title == dataType.name;
    });
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
