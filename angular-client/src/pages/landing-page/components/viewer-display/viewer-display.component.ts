import { Component, OnInit, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import { DataTypeEnum } from 'src/data-type.enum';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import TypographyComponent from 'src/components/typography/typography.component';



@Component({
    selector: 'viewer-display',
    templateUrl: './viewer-display.component.html',
    styleUrl: './viewer-display.component.css',
    standalone: true,
    imports: [InfoBackgroundComponent, TypographyComponent]
})
export class ViewerDisplayComponent implements OnInit {
  private storage = inject(Storage);
  numViewers: number = 0;

  ngOnInit() {
    this.storage.get(DataTypeEnum.VIEWERS).subscribe((value) => {
      this.numViewers = parseInt(value.values[0]);
    });
  }
}
