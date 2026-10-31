import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import APIService from 'src/services/api.service';
import { FaultService } from 'src/services/fault.service';
import Storage from 'src/services/storage.service';
import { TopicSelectionService } from 'src/services/topic-selection.service';
import { QueryResponse } from 'src/utils/api.utils';
import { DataType } from 'src/utils/types.utils';
import { Component, input } from '@angular/core';
import GraphPageComponent from './graph-page.component';
import CustomGraphComponent from './graph/graph.component';
import GraphSidebarComponent from './graph-sidebar/graph-sidebar.component';

@Component({ selector: 'graph', template: '' })
class GraphStub {
  limitRange = input();
  realTime = input();
  valuesSubject = input();
  showMultipleYAxes = input();
  isPaused = input();
  clearGraph = input();
  graphConfig = input();
}
@Component({ selector: 'graph-sidebar', template: '' })
class SidebarStub {
  dataTypes = input();
  isMobile = input();
}

describe('GraphPageComponent — selection made outside its view tree', () => {
  const speed: DataType = { name: 'VCU/CarState/speed', unit: 'mph' };
  it('renders the live value strip after a pick from an overlay (e.g. the mobile topics drawer)', async () => {
    const api: Pick<APIService, 'query'> = {
      query: <T>() =>
        ({
          isLoading: new BehaviorSubject(false),
          data: new BehaviorSubject<DataType[] | null>([speed]),
          isError: new BehaviorSubject(false),
          error: new BehaviorSubject<Error | null>(null)
        }) as unknown as QueryResponse<T>
    };
    const qp = new BehaviorSubject(convertToParamMap({}));
    await TestBed.configureTestingModule({
      imports: [GraphPageComponent],
      providers: [
        TopicSelectionService,
        FaultService,
        Storage,
        { provide: APIService, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: qp,
            snapshot: {
              get queryParamMap() {
                return qp.value;
              }
            }
          }
        },
        { provide: Router, useValue: { url: '/graph', navigate: vi.fn().mockResolvedValue(true) } }
      ]
    })
      .overrideComponent(GraphPageComponent, {
        remove: { imports: [CustomGraphComponent, GraphSidebarComponent] },
        add: { imports: [GraphStub, SidebarStub] }
      })
      .compileComponents();
    const fixture = TestBed.createComponent(GraphPageComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('live-value-strip')).toBeNull();

    // A pick in the drawer reaches the page only through the service; no detectChanges() here.
    TestBed.inject(TopicSelectionService).setSelectedDataTypes([speed]);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('live-value-strip')).not.toBeNull();
  });
});
