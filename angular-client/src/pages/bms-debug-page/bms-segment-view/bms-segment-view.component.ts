import { Component, OnInit } from '@angular/core';
import { inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Chips } from 'src/utils/bms.utils';

@Component({
  selector: 'bms-segment-view',
  templateUrl: './bms-segment-view.component.html',
  styleUrl: './bms-segment-view.component.css'
})
export class BmsSegmentViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  segmentId!: number;
  chipAlpha: Chips = Chips.Alpha;
  chipBeta: Chips = Chips.Beta;

  ngOnInit(): void {
    if (this.route.url.subscribe((url) => url.toString().includes('bms/segment'))) {
      this.route.paramMap.subscribe((params) => {
        this.segmentId = Number(params.get('id'));
      });
    }
  }
}
