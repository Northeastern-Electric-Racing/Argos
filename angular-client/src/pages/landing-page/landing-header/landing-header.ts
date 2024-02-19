import { Component, Input } from '@angular/core';

/**
 * Landing Header Component to display the header on the landing page.
 * @param driver The driver to display.
 * @param location The location to display.
 * @param system The system to display.
 */
@Component({
  selector: 'landing-header',
  templateUrl: './landing-header.component.html',
  styleUrls: ['./landing-header.component.css']
})
export default class LandingHeader {
  time = new Date();
  @Input() driver!: string;
  @Input() location!: string;
  @Input() system!: string;

  /**
   * Updates the time every second.
   */
  ngOnInit() {
    setInterval(() => {
      this.time = new Date();
    }, 1000);
  }
}
