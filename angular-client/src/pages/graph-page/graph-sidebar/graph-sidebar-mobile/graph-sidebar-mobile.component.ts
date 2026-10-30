import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnDestroy,
  computed,
  inject,
  input,
  signal,
  viewChild,
  untracked
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { take } from 'rxjs';
import {
  DropdownOption,
  SelectDropdownComponent,
  SelectorConfig
} from 'src/components/select-dropdown/select-dropdown.component';
import { GraphPresetService, Preset } from 'src/services/graph-preset.service';
import Storage from 'src/services/storage.service';
import { dataTypesToNodes } from 'src/utils/dataTypes.utils';
import { mapNodesToTreeNodes, flattenTreeNodes, filterSelectedNodes } from 'src/utils/tree.utils';
import { DataType } from 'src/utils/types.utils';
import { TopicSelectionService } from 'src/services/topic-selection.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import TypographyComponent from 'src/components/typography/typography.component';
import { PresetDialogComponent } from '../../preset-dialog/preset-dialog.component';
import TopicTreeComponent from '../topic-tree/topic-tree.component';

@Component({
  selector: 'graph-sidebar-mobile',
  templateUrl: './graph-sidebar-mobile.component.html',
  styleUrls: ['./graph-sidebar-mobile.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NzDrawerModule,
    TopicTreeComponent,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    TypographyComponent,
    NzSwitchModule,
    FormsModule,
    SelectDropdownComponent
  ]
})
export default class GraphSidebarMobileComponent implements OnDestroy {
  dataTypes = input.required<DataType[]>();

  private topicSelectionService = inject(TopicSelectionService);
  private presetService = inject(GraphPresetService);
  private modal = inject(NzModalService);
  private storage = inject(Storage);
  private injector = inject(Injector);
  private presetDialogRef?: NzModalRef<PresetDialogComponent, DataType[] | null>;

  sidebarVisible = false;
  treeNodes = computed(() => {
    const nodes = dataTypesToNodes(this.dataTypes());
    // Leaf toSignal()s can't be created in a reactive context; they clean up via the injector.
    return untracked(() => mapNodesToTreeNodes(nodes, this.storage, this.injector));
  });
  flatNodes = computed(() => flattenTreeNodes(this.treeNodes()));
  searchValue = signal('');
  private topicTree = viewChild(TopicTreeComponent);
  flattenMode = signal(false);
  selectedOnly = signal(false);

  private selectedDataTypesSig = toSignal(this.topicSelectionService.getSelectedDataTypes(), { initialValue: [] });
  private selectedFlatNodes = computed(() => filterSelectedNodes(this.flatNodes(), this.selectedDataTypesSig()));
  activeNodes = computed(() => {
    if (this.selectedOnly()) return this.selectedFlatNodes();
    return this.flattenMode() ? this.flatNodes() : this.treeNodes();
  });

  private presets = toSignal(this.presetService.getPresets(), { initialValue: [] as Preset[] });
  presetSelectorConfig = computed<SelectorConfig>(() => ({
    placeholder: 'Apply Preset…',
    options: this.presets().map(
      (p): DropdownOption => ({
        name: p.name,
        function: () => this.applyPreset(p)
      })
    )
  }));
  activePresetName = toSignal(this.presetService.getActivePresetName(), { initialValue: undefined });

  toggleSidebar = () => {
    this.sidebarVisible = !this.sidebarVisible;
  };

  toggleFlattenMode(value: boolean) {
    this.flattenMode.set(value);
  }

  toggleSelectedOnly(value: boolean) {
    this.selectedOnly.set(value);
  }

  clearSelections = () => {
    this.topicTree()?.collapseAll();
    this.topicSelectionService.clearSelection();
  };

  openPresetsDialog = () => {
    this.presetDialogRef = this.modal.create<PresetDialogComponent, { dataTypes: DataType[] }, DataType[] | null>({
      nzTitle: 'Topic Presets',
      nzContent: PresetDialogComponent,
      nzFooter: null,
      nzDraggable: true,
      nzWidth: '90vw',
      nzData: {
        dataTypes: this.dataTypes()
      }
    });
    // eslint-disable-next-line rxjs-angular-x/prefer-takeuntil -- one-shot dialog result; take(1) ends it, and tying it to destroy could drop the result
    this.presetDialogRef.afterClose.pipe(take(1)).subscribe((matched) => {
      if (matched) {
        this.applyMatched(matched);
      }
    });
  };

  ngOnDestroy(): void {
    if (this.presetDialogRef) {
      this.presetDialogRef.destroy();
    }
  }

  private applyPreset(preset: Preset) {
    const matched = this.presetService.resolvePresetTopics(preset, this.dataTypes());
    this.applyMatched(matched);
  }

  private applyMatched(matched: DataType[]) {
    if (matched.length === 0) return; // unknown topics warn toast
    this.topicSelectionService.setSelectedDataTypes(matched);
  }
}
