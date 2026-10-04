import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { BmsSegmentViewComponent } from './bms-segment-view.component';

describe('BmsSegmentViewComponent', () => {
  let component: BmsSegmentViewComponent;
  let fixture: ComponentFixture<BmsSegmentViewComponent>;

  beforeEach(async () => {
    const routeMock = { url: of([]), paramMap: of(convertToParamMap({ id: '1' })) };
    const routerMock = { navigate: () => Promise.resolve(true), url: '/bms/segment/1' };

    await TestBed.configureTestingModule({
      imports: [BmsSegmentViewComponent],
      providers: [
        { provide: ActivatedRoute, useValue: routeMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BmsSegmentViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
