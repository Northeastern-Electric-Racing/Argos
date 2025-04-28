import { Component, HostListener, OnInit } from '@angular/core';
import { inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { allSegments, Chip, Segment } from 'src/utils/bms.utils';

@Component({
  selector: 'bms-segment-view',
  templateUrl: './bms-segment-view.component.html',
  styleUrl: './bms-segment-view.component.css'
})
export class BmsSegmentViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private router = inject(Router);
  changeTitleSize = window.innerWidth < 1060;
  segmentId!: Segment;
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
        const possibleSegId = Number(params.get('id')) - 1;
        allSegments.indexOf(possibleSegId) !== -1 ? (this.segmentId = possibleSegId) : this.router.navigate(['bms']);
      });
    } else {
      this.router.navigate(['bms']);
    }
  };
}
