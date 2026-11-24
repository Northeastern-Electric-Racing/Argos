import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  output
} from '@angular/core';
import { Map as MapLibreMap, NavigationControl, addProtocol, setWorkerUrl } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { MAP_STYLE } from 'src/utils/map.utils';
import { linkMapLibreStyles } from '../maplibre-styles';

addProtocol('pmtiles', new Protocol().tile);
// The bundler moves maplibre away from its worker file; angular.json copies the worker to the site root.
setWorkerUrl('maplibre-gl-worker.mjs');

// Its own component so tests can swap it for a stub instead of needing WebGL.
@Component({
  selector: 'map-canvas',
  templateUrl: './map-canvas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class MapCanvasComponent {
  loaded = output<MapLibreMap>();

  constructor() {
    const container = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    linkMapLibreStyles(inject(DOCUMENT));
    afterNextRender(() => {
      const map = new MapLibreMap({ container, style: MAP_STYLE, zoom: 1, attributionControl: false });
      destroyRef.onDestroy(() => map.remove());
      map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
      map.on('load', () => this.loaded.emit(map));
    });
  }
}
