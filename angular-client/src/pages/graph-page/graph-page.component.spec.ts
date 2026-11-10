import { ToastService } from 'src/ui/toast/toast.service';
import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
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
  let routerNavigate: Mock;

  const dataTypeA: DataType = { name: 'BMS/Pack/SoC', unit: '%' };
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
    routerNavigate = vi.fn().mockName('navigate').mockResolvedValue(true);
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
        ToastService,
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
    const lastNav = routerNavigate.mock.lastCall!;
    expect(lastNav[1].queryParams.topics).toBeNull();
  });

  describe('range input', () => {
    /** Renders the real-time toolbar (past the loading page) and returns its X range field. */
    async function rangeField(): Promise<HTMLInputElement> {
      mountAndLoadDataTypes();
      fixture.componentInstance.dataTypesIsLoading = false;
      fixture.componentRef.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      await fixture.whenStable();
      return fixture.nativeElement.querySelector('#graph-range-value');
    }
    const type = async (field: HTMLInputElement, value: string) => {
      field.value = value;
      field.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
    };

    it.each(['0', '-5'])('clamps %s up to 1, in the field too, as develop\'s p-inputnumber [min]="1" did', async (typed) => {
      const field = await rangeField();
      await type(field, typed);
      expect(field.value).toBe('1');
      expect(fixture.componentInstance.timeRangeSeconds).toBe(1);
      expect(fixture.componentInstance.graphConfig.timeRangeMs).toBe(1000);
    });

    it('leaves the range valid when clamped again at its limit', async () => {
      const field = await rangeField();
      await type(field, '0');
      await type(field, '-5');
      expect(field.value).toBe('1');
      expect(fixture.componentInstance.timeRangeSeconds).toBe(1);
      expect(field.classList).toContain('ng-valid');
    });

    it('clamps the point range too', async () => {
      const field = await rangeField();
      fixture.componentInstance.toggleRangeMode();
      fixture.detectChanges();
      await fixture.whenStable();
      await type(field, '0');
      expect(field.value).toBe('1');
      expect(fixture.componentInstance.graphConfig.maxPoints).toBe(1);
    });

    it('keeps a value of 1 or more as typed', async () => {
      const field = await rangeField();
      await type(field, '45');
      expect(field.value).toBe('45');
      expect(fixture.componentInstance.graphConfig.timeRangeMs).toBe(45000);
    });
  });
});
