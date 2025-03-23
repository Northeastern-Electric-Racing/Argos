import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DropdownOption } from 'src/components/select-dropdown/select-dropdown.component';
import { SegmentSummarys } from '../segment-summary/segment-summary.component';

@Component({
  selector: 'segment-selector',
  templateUrl: './segment-selector.component.html',
  styleUrl: './segment-selector.component.css'
})
export class SegmentSelectorComponent implements OnInit {
  public router = inject(Router);
  selectorOptions: DropdownOption[] = [
    {
      name: 'Accumulator',
      function: () => {
        this.router.navigate(['/bms']);
      }
    }
  ];
  segments = [
    SegmentSummarys.Segment1,
    SegmentSummarys.Segment2,
    SegmentSummarys.Segment3,
    SegmentSummarys.Segment4,
    SegmentSummarys.Segment5
  ];
  placeholder = 'Select Segment';

  constructor() {
    this.selectorOptions.push(
      ...this.segments.map((segment) => {
        return {
          name: `Segment ${segment}`,
          function: () => {
            this.router.navigate(['bms/segment/', segment]);
          }
        };
      })
    );
  }

  ngOnInit() {
    this.placeholder = this.router.url.includes('bms')
      ? `${this.router.url.split('/').pop() === 'bms' ? 'Accumulator' : 'Segment ' + this.router.url.split('/').pop()}`
      : 'Select Segment';
  }
}
