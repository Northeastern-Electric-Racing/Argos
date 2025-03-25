import { Component, OnInit } from '@angular/core';
import { inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Chip } from 'src/utils/bms.utils';

@Component({
  selector: 'bms-segment-view',
  templateUrl: './bms-segment-view.component.html',
  styleUrl: './bms-segment-view.component.css'
})
export class BmsSegmentViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  segmentId!: number;
  chipAlpha: Chip = Chip.Alpha;
  chipBeta: Chip = Chip.Beta;

  ngOnInit(): void {
    this.subscribeToSegmentID();
  }

  subscribeToSegmentID = () => {
    if (this.route.url.subscribe((url) => url.toString().includes('bms/segment'))) {
      this.route.paramMap.subscribe((params) => {
        this.segmentId = Number(params.get('id'));
      });
    }
    console.log('Segment ID:', this.segmentId);
  };
}
