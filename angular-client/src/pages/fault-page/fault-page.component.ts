import { Component, HostListener, OnInit } from '@angular/core';

/**
 * Container for the Fault page, obtains data from the storage service.
 */
@Component({
  selector: 'fault-page',
  styleUrls: ['./fault-page.component.css'],
  templateUrl: './fault-page.component.html'
})
export default class FaultPage implements OnInit {
  time = new Date();
  location: string = 'No Location Set';
  mobileThreshold = 1000;
  isMobile = window.innerWidth < this.mobileThreshold;

  ngOnInit() {}

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
  }
}
