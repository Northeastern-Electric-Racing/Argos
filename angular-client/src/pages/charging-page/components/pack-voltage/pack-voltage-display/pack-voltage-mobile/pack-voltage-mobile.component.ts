import { Component, Input } from '@angular/core';
import Storage from 'src/services/storage.service';
import { GraphData } from 'src/utils/types.utils';

@Component({
  selector: 'pack-voltage-mobile',
  templateUrl: './pack-voltage-mobile.component.html',
  styleUrls: ['./pack-voltage-mobile.component.css']
})
export default class PackVoltageMobileDisplay {
  @Input() voltage: number = 0;
  @Input() packVoltData: GraphData[] = [];
  resetGraphButton = {
    onClick: () => {
      this.packVoltData = [];
    },
    icon: 'restart_alt'
  };
  constructor(private storage: Storage) {}

  ngOnInit() {}
}
