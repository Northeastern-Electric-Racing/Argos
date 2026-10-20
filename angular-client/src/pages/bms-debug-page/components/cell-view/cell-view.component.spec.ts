import { DIALOG_DATA } from '@angular/cdk/dialog';
import { ComponentFixture, TestBed } from '@angular/core/testing';

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
});
