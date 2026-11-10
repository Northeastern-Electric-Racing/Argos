import { DialogRef } from '@angular/cdk/dialog';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  viewChild,
  viewChildren,
  DestroyRef,
  ElementRef
} from '@angular/core';
import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import { OverlayModule } from '@angular/cdk/overlay';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RulePayload } from 'src/api/rules.api';
import { getAllDatatypes } from 'src/api/datatype.api';
import APIService from 'src/services/api.service';
import { DataType } from 'src/utils/types.utils';
import { filter, take } from 'rxjs';
import { UiButtonDirective } from 'src/ui/button/button.directive';
import { UiFieldErrorDirective, UiInputDirective, UiLabelDirective } from 'src/ui/field/field.directive';
import { fieldClasses } from 'src/ui/recipes/field';
import { listboxClasses, listboxPopupClass } from 'src/ui/recipes/listbox';

@Component({
  selector: 'add-rule-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    Combobox,
    ComboboxPopup,
    ComboboxWidget,
    Listbox,
    Option,
    OverlayModule,
    UiButtonDirective,
    UiInputDirective,
    UiLabelDirective,
    UiFieldErrorDirective
  ],
  templateUrl: './add-rule-dialog.component.html'
})
export class AddRuleDialogComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private ref = inject(DialogRef);
  private fb = inject(FormBuilder);
  private serverService = inject(APIService);

  protected readonly f = fieldClasses;
  protected readonly lb = listboxClasses;
  protected readonly popup = listboxPopupClass('fill');

  private allTopics = signal<string[]>([]);
  private listbox = viewChild(Listbox);
  private options = viewChildren<Option<string>>(Option);
  private topicInput = viewChild.required('combobox', { read: ElementRef<HTMLInputElement> });
  private topicPopup = viewChild('topicPopup', { read: ElementRef<HTMLElement> });
  /** Text typed in the topic combobox; the form's topic is only set to a topic it names, in any case (forceSelection). */
  query = signal('');
  popupExpanded = signal(false);
  selectedTopic = signal<string[]>([]);
  filteredTopics = computed(() => {
    const search = this.query().toLowerCase();
    const lower = (t: string) => t.toLowerCase();
    return this.allTopics().filter(
      (topic) => lower(topic).includes(search) || topic.split('/').some((seg) => lower(seg).includes(search))
    );
  });

  constructor() {
    afterRenderEffect(() => {
      if (this.popupExpanded()) this.listbox()?.scrollActiveItemIntoView();
    });
  }

  form = this.fb.group({
    id: ['', Validators.required],
    topic: ['', Validators.required],
    expr: ['', Validators.required],
    debounce_time: [60, [Validators.required, Validators.min(0)]]
  });

  ngOnInit(): void {
    const query = this.serverService.query<DataType[]>(getAllDatatypes);
    query.data
      .pipe(
        filter((d): d is DataType[] => d !== null && d !== undefined),
        take(1),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((dataTypes) => {
        this.allTopics.set(dataTypes.map((dt) => dt.name));
      });
  }

  /** The topic `text` names, ignoring case (PrimeNG's forceSelection matched a suggestion's label this way). */
  private topicNamed(text: string): string | undefined {
    const lower = text.toLowerCase();
    return this.allTopics().find((topic) => topic.toLowerCase() === lower);
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    this.form.controls.topic.setValue(this.topicNamed(value) ?? '');
    if (value) this.popupExpanded.set(true);
  }

  /**
   * Tab or Shift+Tab with the suggestions open picks the highlighted one, as PrimeNG's autocomplete did, and lets
   * focus move on as usual (no preventDefault).
   */
  onTopicKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || !this.popupExpanded()) return;
    const active = this.options().find((option) => option.active());
    if (!active) return;
    this.pick(active.value());
    this.popupExpanded.set(false);
  }

  private pick(topic: string): void {
    this.query.set(topic);
    this.form.controls.topic.setValue(topic);
  }

  /**
   * Picks the active suggestion. A mouse pick has focused the listbox, which is about to close, so focus goes
   * back to the input first (as PrimeNG's autocomplete did); the popup's focusout then sees it staying in the field.
   */
  onCommit(): void {
    const [topic] = this.selectedTopic();
    if (topic) this.pick(topic);
    this.topicInput().nativeElement.focus();
    this.popupExpanded.set(false);
  }

  /**
   * Like PrimeNG's forceSelection: text naming a topic in another case becomes that topic, and free text that isn't
   * a topic is cleared, when focus leaves the field. Focus
   * moving between the input and its suggestions (a pointer down on an option) is not leaving it: clearing then
   * would re-filter the list under the click. The popup's own focusout runs this too, so leaving from there clears.
   */
  onTopicBlur(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && (this.topicInput().nativeElement.contains(next) || this.topicPopup()?.nativeElement.contains(next))) {
      return;
    }
    this.form.controls.topic.markAsTouched();
    this.pick(this.topicNamed(this.query()) ?? '');
  }

  /** Whether a field shows an error, so its input gets aria-invalid and points at the message. */
  protected invalid(name: keyof AddRuleDialogComponent['form']['controls']): boolean {
    const control = this.form.controls[name];
    return control.touched && control.invalid;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const rule: RulePayload = {
      id: value.id!,
      topic: value.topic!,
      expr: value.expr!,
      debounce_time: Number(value.debounce_time)
    };

    this.ref.close(rule);
  }

  onCancel(): void {
    this.ref.close(null);
  }
}
