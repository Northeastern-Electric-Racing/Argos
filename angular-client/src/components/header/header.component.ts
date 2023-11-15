import { Component } from '@angular/core';

/**
 * Header component, supply a left and right side by specifying a div like so:
 * <div header-left>Left side</div>
 * <div header-right>Right side</div>
 */
@Component({
  selector: 'header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export default class Header {}
