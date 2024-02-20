import { Component, OnInit } from '@angular/core';
import { MapService } from '../../services/map.service';

@Component({
  selector: 'map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export default class Map implements OnInit {
  // Define coordinates as a class property
  coordinates: [number, number][] = [
    [-107.81, 37.93],
    [-107, 37.8],
    [-107.4, 38.6],
    [-107.6, 38.5]
  ];

  constructor(private map: MapService) {}

  ngOnInit() {
    // Use the coordinates property
    this.map.buildMap(this.coordinates);
    this.map.addPoints(this.coordinates);
    this.map.addLine(this.coordinates);
  }
}
