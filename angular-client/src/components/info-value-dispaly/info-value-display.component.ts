import { Component, input, OnChanges, OnInit } from '@angular/core';

@Component({
  selector: 'info-value-display',
  templateUrl: './info-value-display.component.html',
  styleUrl: './info-value-display.component.css'
})
export class InfoValueDisplayComponent implements OnInit, OnChanges {
  ngOnChanges(): void {
    this.formattedValue = (this.value()?.toFixed(this.precision()) ?? '-') + (this.unit() === 'C' ? '°' : '');
  }
  containerStyle = input<string>('');
  valueUnitContainerStyle = input<string>('');
  value = input<number>();
  precision = input<number>(1);
  subtitle = input<string>('');
  subtitleStyle = input<string>('');
  unit = input<string>('');
  formattedValue = '-';

  ngOnInit(): void {
    console.log('Info Value Display');
  }
}
