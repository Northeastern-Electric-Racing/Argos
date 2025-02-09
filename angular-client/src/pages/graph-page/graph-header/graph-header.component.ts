import { Component, HostListener, Input, OnInit } from '@angular/core';

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
  @Input() runId?: number;
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
