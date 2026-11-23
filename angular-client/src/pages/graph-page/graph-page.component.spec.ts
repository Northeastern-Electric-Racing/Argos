import { ToastService } from 'src/ui/toast/toast.service';
import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import APIService from 'src/services/api.service';
import { FaultService } from 'src/services/fault.service';
import Storage from 'src/services/storage.service';
import { TopicSelectionService } from 'src/services/topic-selection.service';
import { fakeViewport } from 'src/ui/layout/viewport.testing';
import { QueryResponse } from 'src/utils/api.utils';
import { DataType, Run } from 'src/utils/types.utils';
import GraphPageComponent from './graph-page.component';
import GraphSidebarDesktopComponent from './graph-sidebar/graph-sidebar-desktop/graph-sidebar-desktop.component';

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
  let viewport: ReturnType<typeof fakeViewport>;

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

    viewport = fakeViewport(1024);
    await TestBed.configureTestingModule({
      imports: [GraphPageComponent],
      providers: [
        viewport.provider,
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

  /** Renders the page past the loading page, as it is once the data types have loaded. */
  async function mountLoaded() {
    mountAndLoadDataTypes();
    fixture.componentInstance.dataTypesIsLoading = false;
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
  }

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
      await mountLoaded();
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

  describe('topic sidebar', () => {
    const sidebars = () => [...fixture.nativeElement.querySelectorAll('graph-sidebar')] as HTMLElement[];
    /** Each rendered sidebar's variant, in page order. */
    const shown = () =>
      sidebars().map((el) =>
        el.querySelector('graph-sidebar-mobile') ? 'mobile' : el.querySelector('graph-sidebar-desktop') ? 'desktop' : 'none'
      );
    const resize = async (width: number) => {
      viewport.resize(width);
      await new Promise((resolve) => setTimeout(resolve));
      fixture.detectChanges();
      await fixture.whenStable();
    };

    // Tailwind's max-md is < 768px, so 768px itself is desktop.
    it.each([
      [1024, 'desktop'],
      [768, 'desktop'],
      [767, 'mobile'],
      [375, 'mobile']
    ])('renders only the %ipx sidebar (%s)', async (width, expected) => {
      viewport.resize(width);
      await mountLoaded();
      expect(shown()).toEqual([expected]);
    });

    it('hides the desktop sidebar with Tog Sidebar, leaving none', async () => {
      await mountLoaded();
      fixture.componentInstance.toggleSideBar();
      fixture.detectChanges();
      expect(sidebars()).toEqual([]);
    });

    it('keeps the mobile sidebar when Tog Sidebar has hidden the desktop one', async () => {
      viewport.resize(375);
      await mountLoaded();
      fixture.componentInstance.toggleSideBar();
      fixture.detectChanges();
      expect(shown()).toEqual(['mobile']);
    });

    it('switches sidebars across 768px and keeps the selected topics', async () => {
      topicService.setSelectedDataTypes([dataTypeA, dataTypeB]);
      await mountLoaded();
      /** The topics each rendered sidebar shows as selected. */
      const selected = () =>
        fixture.debugElement
          .queryAll(By.css('graph-sidebar-desktop, graph-sidebar-mobile'))
          .map((el) =>
            ((el.componentInstance as GraphSidebarDesktopComponent).selectedNodes() ?? [])
              .map((node) => node.data?.dataType.name)
              .sort()
          );
      const both = [dataTypeA.name, dataTypeB.name].sort();
      expect(selected()).toEqual([both]);

      await resize(767);
      expect(shown()).toEqual(['mobile']);
      expect(selected()).toEqual([both]);

      await resize(768);
      expect(shown()).toEqual(['desktop']);
      expect(selected()).toEqual([both]);
      expect(topicService.getSelectedDataTypes().value).toEqual([dataTypeA, dataTypeB]);
    });
  });
});

// #847 removed the landing page, which was where mobile users found the nav drawer's toggle.
// The graph page is the new landing spot, so it carries the toggle now; CSS hides it on desktop.
describe('GraphPageComponent — mobile nav toggle', () => {
  beforeEach(async () => {
    const neverLoads = {
      isLoading: new BehaviorSubject<boolean>(true),
      data: new BehaviorSubject<unknown>(null),
      isError: new BehaviorSubject<boolean>(false),
      error: new BehaviorSubject<Error | null>(null)
    };
    const apiServiceMock: Pick<APIService, 'query'> = {
      query: <T>() => neverLoads as unknown as QueryResponse<T>
    };
    const routeMock = {
      queryParamMap: new BehaviorSubject<ParamMap>(convertToParamMap({})).asObservable(),
      snapshot: { queryParamMap: convertToParamMap({}) }
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
        { provide: Router, useValue: { url: '/graph', navigate: vi.fn() } }
      ]
    }).compileComponents();
  });

  // Rendered outside the loading/error branches so the drawer stays reachable in every state.
  it('renders the sidebar toggle while the page is still loading', () => {
    const fixture = TestBed.createComponent(GraphPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('sidebar-toggle')).toBeTruthy();
  });
});
