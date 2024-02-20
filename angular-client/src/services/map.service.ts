import { Injectable } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
import { environment } from 'src/environment/environment';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  map!: mapboxgl.Map;
  private lineLayerId = 'line';

  buildMap(points: [number, number][]) {
    this.map = new mapboxgl.Map({
      container: 'map',
      zoom: 10,
      center: points[0],
      accessToken: environment.mapbox.accessToken
    });
    this.map.addControl(new mapboxgl.NavigationControl());
  }

  addPoints(points: [number, number][]) {
    // Add markers for each point
    points.forEach(([lng, lat]) => {
      new mapboxgl.Marker({
        color: 'red' // Customize marker color as needed
      })
        .setLngLat([lng, lat])
        .addTo(this.map);
    });
  }
  addLine(points: [number, number][]) {
    this.map.on('load', () => {
      this.map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: points
          }
        }
      });
      this.map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#ff0000', // Red color
          'line-width': 3,
          'line-dasharray': [2, 2] // Make the line dashed [dash, gap]
        }
      });
    });
  }
}
