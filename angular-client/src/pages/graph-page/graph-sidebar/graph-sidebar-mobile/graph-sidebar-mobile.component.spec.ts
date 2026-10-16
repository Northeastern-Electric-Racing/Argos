import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
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
      imports: [GraphSidebarMobileComponent],
      providers: [MessageService, DialogService]
    }).compileComponents();

    topicService = TestBed.inject(TopicSelectionService);
    fixture = TestBed.createComponent(GraphSidebarMobileComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('dataTypes', [soc]);
    fixture.detectChanges();
  });

  it('builds the tree from dataTypes', () => {
    expect(component.treeNodes().map((n) => n.label)).toEqual(['BMS']);
    expect(component.flatNodes().map((n) => n.data?.dataType.name)).toEqual(['BMS/Pack/SoC']);
  });

  it('rebuilds the tree and selection when dataTypes changes', () => {
    topicService.addDataType(speed);
    fixture.componentRef.setInput('dataTypes', [soc, speed]);
    fixture.detectChanges();

    expect(component.treeNodes().map((n) => n.label)).toEqual(['BMS', 'MPU']);
    expect(component.flatNodes().length).toBe(2);
    expect(component.selectedNodes()?.map((n) => n.data?.dataType.name)).toEqual(['MPU/State/Speed']);
  });
});
