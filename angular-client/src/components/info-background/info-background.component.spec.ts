import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { TopicSelectionService } from 'src/services/topic-selection.service';
import { InfoBackgroundComponent } from './info-background.component';

describe('InfoBackgroundComponent', () => {
  let fixture: ComponentFixture<InfoBackgroundComponent>;
  let router: Router;
  let topicSelectionService: TopicSelectionService;

  const graphLink = (): HTMLElement | null => fixture.nativeElement.querySelector('button[aria-label="Open in graph"]');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoBackgroundComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(InfoBackgroundComponent);
    router = TestBed.inject(Router);
    topicSelectionService = TestBed.inject(TopicSelectionService);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.componentRef.setInput('title', 'Speed');
  });

  it('should not show a graph link without graph topics', () => {
    fixture.detectChanges();

    expect(graphLink()).toBeNull();
  });

  it('should open the graph page with only the graph topics selected', () => {
    topicSelectionService.setSelectedDataTypes([{ name: 'BMS/Pack/SoC', unit: '%' }]);
    fixture.componentRef.setInput('graphTopics', ['MPU/State/Speed', 'VCU/CarState/torque']);
    fixture.detectChanges();

    graphLink()!.click();

    expect(topicSelectionService.getSelectedDataTypes().value).toEqual([]);
    expect(router.navigate).toHaveBeenCalledWith(['/graph'], {
      queryParams: { topics: 'MPU/State/Speed,VCU/CarState/torque' }
    });
  });

  it('should not fire the card click when the graph link is clicked', () => {
    const onClick = vi.fn();
    fixture.componentRef.setInput('onClick', onClick);
    fixture.componentRef.setInput('graphTopics', ['MPU/State/Speed']);
    fixture.detectChanges();

    graphLink()!.click();

    expect(onClick).not.toHaveBeenCalled();
  });
});
