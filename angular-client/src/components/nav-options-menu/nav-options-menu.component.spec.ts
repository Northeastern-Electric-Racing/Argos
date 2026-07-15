import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';

import { NavOptionsMenuComponent } from './nav-options-menu.component';

describe('NavOptionsMenuComponent', () => {
  let component: NavOptionsMenuComponent;
  let fixture: ComponentFixture<NavOptionsMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavOptionsMenuComponent],
      providers: [{ provide: DynamicDialogConfig, useValue: { data: { items: [] } } }]
    }).compileComponents();

    fixture = TestBed.createComponent(NavOptionsMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
