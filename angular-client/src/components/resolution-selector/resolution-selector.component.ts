import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';

@Component({
  selector: 'resolution-selector',
  templateUrl: './resolution-selector.component.html',
  styleUrls: ['./resolution-selector.component.css']
})
export default class ResolutionSelector {
  resolutions = [
    { label: '100ms', value: 100 },
    { label: '10ms', value: 10 },
    { label: '500ms', value: 500 },
    { label: '1000ms', value: 1000 }
  ];
  selectedResolution: number;

  constructor(private storage: Storage) {
    this.selectedResolution = this.storage.getResolution();
  }

  onSelect = (event: Event) => {
    const resolution = parseFloat((event.target as HTMLSelectElement).value);
    this.storage.setResolution(resolution);
    this.selectedResolution = resolution;
  };
}
