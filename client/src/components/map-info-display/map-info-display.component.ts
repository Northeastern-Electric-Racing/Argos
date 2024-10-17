import { Component, OnInit } from '@angular/core';
import { MapService } from 'src/services/map.service';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';

@Component({
  selector: 'map-info-display',
  templateUrl: './map-info-display.component.html',
  styleUrls: ['./map-info-display.component.css']
})
export default class MapInfoDisplay implements OnInit {
  constructor(
    private storage: Storage,
    private map: MapService
  ) {}

  ngOnInit(): void {
    setTimeout(() => {
      this.map.buildMap('map-preview');
      this.map.addPolyline([]);
      this.storage.get(IdentifierDataType.POINTS).subscribe((value) => {
        this.map.addCoordinateToPolyline(this.map.transformDataToCoordinate(value));
      });
    }, 100);
  }
}
