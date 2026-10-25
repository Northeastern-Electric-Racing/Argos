import { ComponentFixture, TestBed } from '@angular/core/testing';
import SidebarCardComponent from './sidebar-card.component';

describe('SidebarCardComponent', () => {
  let fixture: ComponentFixture<SidebarCardComponent>;
  let component: SidebarCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Pack');
    fixture.componentRef.setInput('topicName', 'BMS/Pack/');
    fixture.detectChanges();
  });

  it('derives the icon id from the title', () => {
    expect(component.iconId()).toBe('Pack-icon');
  });

  it('updates the icon id when the title changes', () => {
    fixture.componentRef.setInput('title', 'Cells');
    fixture.detectChanges();

    expect(component.iconId()).toBe('Cells-icon');
  });
});
