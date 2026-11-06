import { DIALOG_DATA } from '@angular/cdk/dialog';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectedCellInfo } from 'src/services/heat-map.service';
import { CellViewComponent } from './cell-view.component';

describe('CellViewComponent', () => {
  let component: CellViewComponent;
  let fixture: ComponentFixture<CellViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CellViewComponent],
      providers: [{ provide: DIALOG_DATA, useValue: { cells: new Map() } }]
    }).compileComponents();

    fixture = TestBed.createComponent(CellViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('colours balancing and CvS values with AA text tokens, never the raw tile colours', () => {
    const cell = { reading: { balancing: true, cvs: true }, cellNum: 3, segment: 0 } as unknown as SelectedCellInfo;
    const classOf = (label: string) => component.rows.find((r) => r.label === label)!.getClass!(cell);
    expect(classOf('Balancing')).toBe('text-info');
    expect(classOf('CvS Failure')).toBe('text-accent-fg');
    cell.reading.balancing = false;
    cell.reading.cvs = false;
    expect(classOf('Balancing')).toBe('text-warn');
    expect(classOf('CvS Failure')).toBe('text-success');
  });
});
