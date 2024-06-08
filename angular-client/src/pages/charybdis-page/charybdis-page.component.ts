import { Component, HostListener, OnInit } from '@angular/core';

/**
 * Container for the landing page, obtains data from the storage service.
 */
@Component({
  selector: 'charybdis-page',
  styleUrls: ['./charybdis-page.component.css'],
  templateUrl: './charybdis-page.component.html'
})
export default class CharybdisPage implements OnInit {
  label = 'Wipe this shit';
  mobileThreshold = 1000;
  isMobile = window.innerWidth < this.mobileThreshold;

  ngOnInit() {}

  onClick() {}

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
  }
}
