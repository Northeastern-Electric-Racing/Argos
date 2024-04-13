import { Injectable } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
import { environment } from 'src/environment/environment';
import { DataValue } from 'src/utils/socket.utils';
import { Coordinate } from 'src/utils/types.utils';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  map!: mapboxgl.Map;

  buildMap = (contianer: string) => {
    this.map = new mapboxgl.Map({
      container: contianer,
      zoom: 0,
      center: [0, 0],
      accessToken: environment.mapbox.accessToken
    });
    this.map.addControl(new mapboxgl.NavigationControl());
  };

  addCoordinateToPolyline = (coordinate: Coordinate) => {
    const source = this.map.getSource('route') as any;

    const data = source._data;
    // Extract the LineString feature
    if (data && data.type === 'LineString') {
      // Append the new coordinate
      data.coordinates.push([coordinate.lng, coordinate.lat]);

      // Update the source data
      source.setData(data);
    } else if (data && data.type === 'Feature') {
      // Append the new coordinate
      data.geometry.coordinates.push([coordinate.lng, coordinate.lat]);

      // Update the source data
      source.setData(data);
    }
  };

  addPolyline = (coordinates: Coordinate[]) => {
    const lngLatCoordinates = coordinates.map((coordinate) => [coordinate.lng, coordinate.lat]);

    const geojson = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: lngLatCoordinates
      }
    };

    this.map.on('load', () => {
      this.map.addSource('route', {
        type: 'geojson',
        data: geojson as any
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
          'line-color': '#888',
          'line-width': 8
        }
      });

      if (coordinates.length === 0) return;

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

  transformDataToCoordinate(data: DataValue): Coordinate {
    return { lat: parseFloat(data.values[1]), lng: parseFloat(data.values[0]) };
  }
}
