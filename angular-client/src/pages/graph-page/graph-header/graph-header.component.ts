import { Component, HostListener, input, OnInit } from '@angular/core';

/**
 * Graph Header Component to display the graph page header.
 * Utilizes the header component to display the header.
 */
@Component({
  selector: 'graph-header',
  templateUrl: './graph-header.component.html',
  styleUrls: ['./graph-header.component.css']
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

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobile = window.innerWidth <= 768;
  }
}
