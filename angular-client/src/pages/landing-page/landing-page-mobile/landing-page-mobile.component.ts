import { Component, Input } from '@angular/core';

@Component({
  selector: 'landing-page-mobile',
  templateUrl: './landing-page-mobile.component.html',
  styleUrls: ['./landing-page-mobile.component.css']
})
export default class LandingPageMobile {
   @Input() time!: Date
}
