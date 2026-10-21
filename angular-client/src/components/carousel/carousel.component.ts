import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, DestroyRef, inject, signal, ChangeDetectionStrategy, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Run } from 'src/utils/types.utils';
import { MatGridList, MatGridTile } from '@angular/material/grid-list';
import { MatIcon } from '@angular/material/icon';
import TypographyComponent from '../typography/typography.component';

// the data for the dialog, basically just all the runs
export interface DialogData {
  runs: Run[];
  selectRun: (run: Run) => void;
}

const AUTOPLAY_MS = 3000;

/**
 * Run picker carousel. Neither Angular Aria nor the CDK has a carousel, so this follows the
 * WAI-ARIA carousel pattern by hand: prev/next buttons, a stop/start rotation control, autoplay
 * that pauses while the pointer or keyboard focus is inside (and is off under reduced motion),
 * and a slide live region that only announces while not rotating.
 */
@Component({
  selector: 'carousel',
  templateUrl: 'carousel.component.html',
  styleUrls: ['carousel.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatGridList, MatGridTile, MatIcon, TypographyComponent]
})
export class CarouselComponent {
  public dialogRef = inject(DialogRef);
  public dialogData = inject<DialogData>(DIALOG_DATA);
  public router = inject(Router);
  runs: Run[] = this.dialogData.runs ?? [];
  currentIndex = signal(0);
  currentRun = computed(() => this.runs[this.currentIndex()]);
  /** The user's stop/start choice; starts off when the OS asks for reduced motion. */
  autoplay = signal(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  private paused = signal(false);
  rotating = computed(() => this.autoplay() && !this.paused());

  constructor() {
    const timer = setInterval(() => {
      if (this.rotating()) this.next();
    }, AUTOPLAY_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  selectRun = (run: Run) => {
    this.dialogRef.close();
    this.dialogData.selectRun(run);
  };

  next(): void {
    if (this.runs.length === 0) return;
    this.currentIndex.update((i) => (i + 1) % this.runs.length);
  }

  prev(): void {
    if (this.runs.length === 0) return;
    this.currentIndex.update((i) => (i - 1 + this.runs.length) % this.runs.length);
  }

  goTo(index: number): void {
    this.currentIndex.set(index);
  }

  setPaused(paused: boolean): void {
    this.paused.set(paused);
  }

  /** Keyboard focus pauses rotation; the dialog's initial focus after a mouse click doesn't. */
  onFocusIn(event: FocusEvent): void {
    if ((event.target as HTMLElement).matches?.(':focus-visible')) this.setPaused(true);
  }

  datePipe = (date: Date) => {
    date = new Date(date);
    return `${date.toLocaleString()}`;
  };
}
