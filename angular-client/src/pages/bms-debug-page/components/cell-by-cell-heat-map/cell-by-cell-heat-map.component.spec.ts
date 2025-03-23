import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CellByCellHeatMapComponent } from './cell-by-cell-heat-map.component';

describe('CellByCellHeatMapComponent', () => {
  let component: CellByCellHeatMapComponent;
  let fixture: ComponentFixture<CellByCellHeatMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CellByCellHeatMapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CellByCellHeatMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
