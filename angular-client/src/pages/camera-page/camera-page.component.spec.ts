import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CameraPageComponent } from './camera-page.component';

describe('CameraPageComponent', () => {
  let component: CameraPageComponent;
  let fixture: ComponentFixture<CameraPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CameraPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CameraPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
