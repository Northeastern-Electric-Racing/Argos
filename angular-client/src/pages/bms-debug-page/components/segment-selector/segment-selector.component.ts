import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DropdownOption } from 'src/components/select-dropdown/select-dropdown.component';

@Component({
  selector: 'segment-selector',
  templateUrl: './segment-selector.component.html',
  styleUrl: './segment-selector.component.css'
})
export class SegmentSelectorComponent {
  public router = inject(Router);
  views: DropdownOption[] = [
    {
      name: 'Summary',
      function: () => {
        this.router.navigate(['/bms']);
      }
    }
  ];
}
