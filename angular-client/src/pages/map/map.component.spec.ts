import { ComponentFixture, TestBed } from '@angular/core/testing';

import  Map  from './map.component';

describe('MapComponent', () => {
  let component: Map;
  let fixture: ComponentFixture<Map>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [Map]
    });
    fixture = TestBed.createComponent(Map);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
