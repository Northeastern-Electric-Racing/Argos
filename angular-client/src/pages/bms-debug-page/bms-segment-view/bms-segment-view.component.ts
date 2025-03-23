import { Component, OnInit } from '@angular/core';
import { inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'bms-segment-view',
  templateUrl: './bms-segment-view.component.html',
  styleUrl: './bms-segment-view.component.css'
})
export class BmsSegmentViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  segmentId!: number;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.segmentId = Number(params.get('id'));
    });
  }
}
