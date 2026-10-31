import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TopicSelectionService } from 'src/services/topic-selection.service';
import { DataType } from 'src/utils/types.utils';
import GraphSidebarMobileComponent from './graph-sidebar-mobile.component';

describe('GraphSidebarMobileComponent', () => {
  let fixture: ComponentFixture<GraphSidebarMobileComponent>;
  let component: GraphSidebarMobileComponent;
  let topicService: TopicSelectionService;

  const soc: DataType = { name: 'BMS/Pack/SoC', unit: '%' };
  const speed: DataType = { name: 'MPU/State/Speed', unit: 'mph' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraphSidebarMobileComponent]
    }).compileComponents();

    topicService = TestBed.inject(TopicSelectionService);
    fixture = TestBed.createComponent(GraphSidebarMobileComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('dataTypes', [soc]);
    fixture.detectChanges();
  });

  it('builds the tree from dataTypes', () => {
    expect(component.treeNodes().map((n) => n.title)).toEqual(['BMS']);
    expect(component.flatNodes().map((n) => n.data?.dataType.name)).toEqual(['BMS/Pack/SoC']);
  });

  it('rebuilds the tree when dataTypes changes, keeping the selection', () => {
    topicService.addDataType(speed);
    fixture.componentRef.setInput('dataTypes', [soc, speed]);
    fixture.detectChanges();

    expect(component.treeNodes().map((n) => n.title)).toEqual(['BMS', 'MPU']);
    expect(component.flatNodes().length).toBe(2);
    expect(topicService.isSelected(speed)).toBe(true);
  });

  describe('topics drawer', () => {
    const focusable = 'button, input, [tabindex]:not([tabindex="-1"])';
    const closedDrawerControls = () => document.querySelectorAll(`.ant-drawer:not(.ant-drawer-open) :is(${focusable})`);
    const drawerControls = () => document.querySelectorAll(`.ant-drawer-open :is(${focusable})`);
    /** Waits out nz-drawer's 300ms open or close animation, then re-renders. */
    const afterAnimation = async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
      fixture.detectChanges();
      await fixture.whenStable();
    };
    const toggle = () => fixture.nativeElement.querySelector('.toggle-btn') as HTMLButtonElement;

    afterEach(() => fixture.destroy());

    it('leaves nothing focusable behind while closed', async () => {
      await afterAnimation();
      expect(closedDrawerControls()).toHaveLength(0);
    });

    it('shows its controls when opened and removes them once closed', async () => {
      toggle().click();
      await afterAnimation();
      expect(drawerControls().length).toBeGreaterThan(0);
      expect(document.querySelector('.ant-drawer-open input[aria-label="Search topics"]')).not.toBeNull();

      (document.querySelector('.ant-drawer-close') as HTMLButtonElement).click();
      await afterAnimation();
      expect(drawerControls()).toHaveLength(0);
      expect(closedDrawerControls()).toHaveLength(0);
    });
  });
});
