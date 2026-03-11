import { Component, HostListener, input, OnInit } from '@angular/core';
import SidebarToggleComponent from 'src/components/sidebar-toggle/sidebar-toggle.component';
import TypographyComponent from 'src/components/typography/typography.component';

/**
 * Graph Header Component to display the graph page header.
 * Utilizes the header component to display the header.
 */
@Component({
  selector: 'graph-header',
  templateUrl: './graph-header.component.html',
  styleUrls: ['./graph-header.component.css'],
  standalone: true,
  imports: [TypographyComponent, SidebarToggleComponent]
})
export default class GraphHeaderComponent implements OnInit {
  rightHeader = input.required<string>();
  isMobile = window.innerWidth <= 768;

  time = new Date();

  ngOnInit() {
    setInterval(() => {
      this.time = new Date();
    }, 1000);
  }

  @HostListener('window:resize')
  onResize() {
    this.isMobile = window.innerWidth <= 768;
  }
}
