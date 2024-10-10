import { Component, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';

@Component({
  selector: 'landing-page-viewer-display',
  templateUrl: './landing-page-viewer-display.component.html',
  styleUrl: './landing-page-viewer-display.component.css'
})
export class LandingPageViewerDisplay implements OnInit {
  numViewers: number = 0;
  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.VIEWERS).subscribe((value) => {
      this.numViewers = parseInt(value.values[0]);
    });
  }
}
