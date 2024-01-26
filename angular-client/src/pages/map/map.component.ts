import { Component, OnInit } from '@angular/core';
import { MapService } from './map.service';

@Component({
  selector: 'map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export default class Map implements OnInit {
  constructor(private map: MapService) {
  }

  ngOnInit() {
    this.map.buildMap();
  }
}
