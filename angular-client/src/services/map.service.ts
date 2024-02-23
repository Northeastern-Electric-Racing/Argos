import { Injectable } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
import { environment } from 'src/environment/environment';
import { Coordinate } from 'src/utils/types.utils';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  map!: mapboxgl.Map;

  buildMap = () => {
    this.map = new mapboxgl.Map({
      container: 'map',
      zoom: 0,
      center: [0, 0],
      accessToken: environment.mapbox.accessToken
    });
    this.map.addControl(new mapboxgl.NavigationControl());
  };

  addPolyline = (coordinates: Coordinate[]) => {
    const lngLatCoordinates = coordinates.map((coordinate) => [coordinate.lng, coordinate.lat]);

    this.map.on('load', () => {
      this.map.addLayer({
        id: 'route',
        type: 'line',
        source: {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: lngLatCoordinates
            }
          }
        },
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#888',
          'line-width': 8
        }
      });

      const bounds = coordinates.reduce(
        (bounds, coord) => {
          return bounds.extend(coord);
        },
        new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
      );

      // Fit the map to the bounding box
      this.map.fitBounds(bounds, {
        padding: 20 // Optional padding around the bounding box
      });
    });
  };
}
