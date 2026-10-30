import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { BaseChartDirective } from 'ng2-charts';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { GraphDialogComponent } from './graph-dialog.component';

const DIALOG_SOURCE = 'src/components/graph-dialog/graph-dialog.component.ts';

/** The project files `file` imports at runtime (type-only imports are erased, so they can't form a cycle). */
function projectImports(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(/^import\s+(?!type\b)[^;]*?from\s+'([^']+)'/gm)]
    .map(([, specifier]) => specifier)
    .filter((specifier) => specifier.startsWith('.') || specifier.startsWith('src/'))
    .map((specifier) => normalize(specifier.startsWith('.') ? join(dirname(file), specifier) : specifier) + '.ts')
    .filter((path) => existsSync(path));
}

/** Whether following runtime imports from `file` leads back to `target`. */
function importsReach(file: string, target: string, seen = new Set<string>()): boolean {
  return projectImports(file).some((next) => {
    if (next === target) return true;
    if (seen.has(next)) return false;
    seen.add(next);
    return importsReach(next, target, seen);
  });
}

describe('GraphDialogComponent', () => {
  it('draws the graph it was opened with', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DynamicDialogConfig,
          useValue: { data: { data: [{ x: 1_000, y: 10 }], color: '#ff0000', title: 'Speed' } }
        },
        { provide: DynamicDialogRef, useValue: {} }
      ]
    });
    const fixture = TestBed.createComponent(GraphDialogComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const chart = fixture.debugElement.query(By.directive(BaseChartDirective)).injector.get(BaseChartDirective).chart!;
    expect(chart.data.datasets[0].label).toBe('Speed');
    expect(chart.data.datasets[0].data).toEqual([{ x: 1_000, y: 10 }]);
    fixture.destroy();
  });

  // A cycle (e.g. graph.component importing this dialog to open it) left the dialog empty with NG0919 in the app.
  // Whether the test above sees that depends on the order the bundler puts the modules in, so check the imports.
  it('is not imported back by anything it imports', () => {
    expect(importsReach(DIALOG_SOURCE, DIALOG_SOURCE)).toBe(false);
  });
});
