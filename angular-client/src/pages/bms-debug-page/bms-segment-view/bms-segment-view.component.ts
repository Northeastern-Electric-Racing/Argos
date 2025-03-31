import { Component, HostListener, OnInit } from '@angular/core';
import { inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Chip } from 'src/utils/bms.utils';

@Component({
  selector: 'bms-segment-view',
  templateUrl: './bms-segment-view.component.html',
  styleUrl: './bms-segment-view.component.css'
})
export class BmsSegmentViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  changeTitleSize = window.innerWidth < 1060;
  segmentId!: number;
  chipAlpha: Chip = Chip.Alpha;
  chipBeta: Chip = Chip.Beta;

  ngOnInit(): void {
    this.subscribeToSegmentID();
  }

  // Update view width
  @HostListener('window:resize', ['$event'])
  onResize() {
    this.changeTitleSize = window.innerWidth < 1060;
  }

  subscribeToSegmentID = () => {
    if (this.route.url.subscribe((url) => url.toString().includes('bms/segment'))) {
      this.route.paramMap.subscribe((params) => {
        this.segmentId = Number(params.get('id')) - 1; // Adjust for 0-based index, only display values are 1-based
      });
    }
  };
}
