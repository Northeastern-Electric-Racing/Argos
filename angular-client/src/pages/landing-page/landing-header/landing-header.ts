import { Component, Input } from '@angular/core';

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

  ngOnInit() {
    // Perform the query and subscribe to the result
    setInterval(() => {
      this.time = new Date();
    }, 1000);
  }
}
