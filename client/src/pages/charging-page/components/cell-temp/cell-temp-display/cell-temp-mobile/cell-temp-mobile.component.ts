import { Component, Input } from '@angular/core';
import Storage from 'src/services/storage.service';

import { GraphData } from 'src/utils/types.utils';

@Component({
  selector: 'cell-temp-mobile',
  templateUrl: './cell-temp-mobile.component.html',
  styleUrls: ['./cell-temp-mobile.component.css']
})
export default class CellTempMobile {
  @Input() avgTemp: number = 0;
  @Input() maxTemp: number = 0;
  @Input() resetGraphButton = {
    onClick: () => {
      this.cellTempData = [];
    },
    icon: 'restart_alt'
  };
  @Input() cellTempData: GraphData[] = [];
  constructor(private storage: Storage) {}

  ngOnInit() {}
}
