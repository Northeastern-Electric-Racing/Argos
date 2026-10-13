import { Component, DestroyRef, ElementRef, afterNextRender, inject, input, output } from '@angular/core';
import { Map as MapLibreMap, NavigationControl, StyleSpecification, addProtocol, setWorkerUrl } from 'maplibre-gl';
import { Protocol } from 'pmtiles';

addProtocol('pmtiles', new Protocol().tile);

// Its own component so tests can swap it for a stub instead of needing WebGL.
@Component({
  selector: 'map-canvas',
  standalone: true,
  templateUrl: './map-canvas.component.html'
})
export default class MapCanvasComponent {
  mapStyle = input.required<StyleSpecification>();
  loaded = output<MapLibreMap>();

  constructor() {
    const container = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      // The bundler moves maplibre away from its worker file; angular.json copies the worker to the site root.
      setWorkerUrl('maplibre-gl-worker.mjs');
      const map = new MapLibreMap({ container, style: this.mapStyle(), center: [0, 0], zoom: 1, attributionControl: false });
      destroyRef.onDestroy(() => map.remove());
      map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
      map.on('load', () => this.loaded.emit(map));
    });
  }
}
