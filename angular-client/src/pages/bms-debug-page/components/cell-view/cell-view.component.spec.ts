import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CELL_COMPARE_DATA, CellViewComponent } from './cell-view.component';

describe('CellViewComponent', () => {
  let component: CellViewComponent;
  let fixture: ComponentFixture<CellViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CellViewComponent],
      providers: [{ provide: CELL_COMPARE_DATA, useValue: { cells: new Map(), close: () => undefined } }]
    }).compileComponents();

    fixture = TestBed.createComponent(CellViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
