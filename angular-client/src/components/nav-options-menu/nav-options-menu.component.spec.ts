import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NavOptionsMenuComponent } from './nav-options-menu.component';

describe('NavOptionsMenuComponent', () => {
  let component: NavOptionsMenuComponent;
  let fixture: ComponentFixture<NavOptionsMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavOptionsMenuComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NavOptionsMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
