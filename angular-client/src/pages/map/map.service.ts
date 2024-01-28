import { Injectable } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
import { environment } from 'src/environment/environment';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  map!: mapboxgl.Map;

  buildMap() {
    this.map = new mapboxgl.Map({
      container: 'map',
      zoom: 0,
      center: [0, 0],
      accessToken: environment.mapbox.accessToken
    });
    this.map.addControl(new mapboxgl.NavigationControl());
  }
}
