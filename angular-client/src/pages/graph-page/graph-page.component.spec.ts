import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BehaviorSubject } from 'rxjs';
import APIService from 'src/services/api.service';
import { FaultService } from 'src/services/fault.service';
import Storage from 'src/services/storage.service';
import { TopicSelectionService } from 'src/services/topic-selection.service';
import { QueryResponse } from 'src/utils/api.utils';
import { DataType, Run } from 'src/utils/types.utils';
import GraphPageComponent from './graph-page.component';

describe('GraphPageComponent — URL/topic-selection sync', () => {
  let fixture: ComponentFixture<GraphPageComponent>;
  let topicService: TopicSelectionService;
  let routerNavigate: jasmine.Spy;

  const dataTypeA: DataType = { name: 'BMS/Pack/SOC', unit: '%' };
  const dataTypeB: DataType = { name: 'MPU/State/Speed', unit: 'mph' };
  const dataTypeC: DataType = { name: 'BMS/Pack/Voltage', unit: 'V' };
  const allDataTypes: DataType[] = [dataTypeA, dataTypeB, dataTypeC];

  let dataTypesData: BehaviorSubject<DataType[] | null>;
  let queryParamMap: BehaviorSubject<ParamMap>;

  beforeEach(async () => {
    dataTypesData = new BehaviorSubject<DataType[] | null>(null);
    const runsData = new BehaviorSubject<Run[] | null>(null);

    // First query() call comes from queryDataTypes; subsequent from initGeneralPage (runs).
    let queryCalls = 0;
    const apiServiceMock: Pick<APIService, 'query'> = {
      query: <T>() => {
        queryCalls += 1;
        const response =
          queryCalls === 1
            ? {
                isLoading: new BehaviorSubject<boolean>(true),
                data: dataTypesData,
                isError: new BehaviorSubject<boolean>(false),
                error: new BehaviorSubject<Error | null>(null)
              }
            : {
                isLoading: new BehaviorSubject<boolean>(true),
                data: runsData,
                isError: new BehaviorSubject<boolean>(false),
                error: new BehaviorSubject<Error | null>(null)
              };
        return response as unknown as QueryResponse<T>;
      }
    };

    queryParamMap = new BehaviorSubject<ParamMap>(convertToParamMap({}));
    const routeMock = {
      queryParamMap: queryParamMap.asObservable(),
      snapshot: {
        get queryParamMap() {
          return queryParamMap.value;
        }
      }
    };
    routerNavigate = jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true));
    const routerMock = {
      url: '/graph',
      navigate: routerNavigate
    };

    await TestBed.configureTestingModule({
      imports: [GraphPageComponent],
      providers: [
        TopicSelectionService,
        FaultService,
        Storage,
        MessageService,
        { provide: APIService, useValue: apiServiceMock },
        { provide: ActivatedRoute, useValue: routeMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    topicService = TestBed.inject(TopicSelectionService);
  });

  // dataTypesIsLoading stays true so the template keeps showing loading-page; this avoids
  // booting child components whose deps aren't wired up in this test bed. The data-subscription
  // path (and therefore syncUrlToService) still runs because we emit on `data` directly.
  function mountAndLoadDataTypes() {
    fixture = TestBed.createComponent(GraphPageComponent);
    fixture.detectChanges();
    dataTypesData.next(allDataTypes);
  }

  it('preserves non-empty service state when URL has no topics param (regression for #622)', () => {
    topicService.setSelectedDataTypes([dataTypeA, dataTypeB]);
    mountAndLoadDataTypes();

    expect(topicService.getSelectedDataTypes().value).toEqual([dataTypeA, dataTypeB]);
  });

  it('hydrates service from URL deep link when service is empty', () => {
    queryParamMap.next(convertToParamMap({ topics: `${dataTypeA.name},${dataTypeB.name}` }));
    mountAndLoadDataTypes();

    const names = topicService
      .getSelectedDataTypes()
      .value.map((d) => d.name)
      .sort();
    expect(names).toEqual([dataTypeA.name, dataTypeB.name].sort());
  });

  it('merges URL topics into service additively (no removals driven by URL)', () => {
    topicService.setSelectedDataTypes([dataTypeA]);
    queryParamMap.next(convertToParamMap({ topics: dataTypeC.name }));
    mountAndLoadDataTypes();

    const names = topicService
      .getSelectedDataTypes()
      .value.map((d) => d.name)
      .sort();
    expect(names).toEqual([dataTypeA.name, dataTypeC.name].sort());
  });

  it('clears service and topics URL param when selection is explicitly cleared', () => {
    topicService.setSelectedDataTypes([dataTypeA]);
    mountAndLoadDataTypes();

    topicService.clearSelection();

    expect(topicService.getSelectedDataTypes().value).toEqual([]);
    const lastNav = routerNavigate.calls.mostRecent();
    expect(lastNav.args[1].queryParams.topics).toBeNull();
  });
});
