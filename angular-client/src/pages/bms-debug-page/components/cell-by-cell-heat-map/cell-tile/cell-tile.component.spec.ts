import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CellTileComponent } from './cell-tile.component';

describe('CellTileComponent', () => {
  let component: CellTileComponent;
  let fixture: ComponentFixture<CellTileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CellTileComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CellTileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
