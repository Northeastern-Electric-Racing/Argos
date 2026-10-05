import { Component, OnInit, inject, input, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Storage from 'src/services/storage.service';

import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import TypographyComponent from 'src/components/typography/typography.component';
import HStackComponent from 'src/components/hstack/hstack.component';

@Component({
  selector: 'current-run-display',
  templateUrl: './current-run-display.component.html',
  styleUrl: './current-run-display.component.css',
  standalone: true,
  imports: [InfoBackgroundComponent, TypographyComponent, HStackComponent]
})
export class CurrentRunDisplayComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private storage = inject(Storage);
  currentRun: number = 0;
  navBarStyle = input<boolean>(false);
  small = input<boolean>(false);

  ngOnInit() {
    this.storage
      .getCurrentRunId()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((runId) => {
        if (runId) {
          this.currentRun = runId;
        }
      });
  }
}
