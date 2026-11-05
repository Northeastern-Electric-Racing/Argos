import { MenuHarness } from '@angular/aria/menu/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import LapTimerService from 'src/services/lap-timer.service';
import { ConfirmOptions, ConfirmService } from 'src/ui/confirm/confirm.service';
import SessionsPanelComponent from './sessions-panel.component';

describe('SessionsPanelComponent', () => {
  let fixture: ComponentFixture<SessionsPanelComponent>;
  let timer: LapTimerService;
  const settle = async () => {
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 20));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    localStorage.clear();
    fixture = TestBed.createComponent(SessionsPanelComponent);
    timer = TestBed.inject(LapTimerService);
    document.body.appendChild(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    timer.clearAllSessions();
    fixture.nativeElement.remove();
    document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
  });

  const el = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement | null;
  const nameButton = (id: string) => el(`button[data-session="${id}"]`);
  const nameInput = () => el('input[aria-label="Session name"]') as HTMLInputElement | null;
  const newSessionButton = () =>
    Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('New Session')
    )!;
  const rowMenu = async (index: number) => {
    const triggers = fixture.nativeElement.querySelectorAll('button[aria-label="Session actions"]');
    (triggers[index] as HTMLButtonElement).click();
    await settle();
    return TestbedHarnessEnvironment.documentRootLoader(fixture).getHarness(MenuHarness);
  };
  const choose = async (index: number, label: string) => {
    const items = await (await rowMenu(index)).getItems();
    for (const item of items) if ((await item.getText()).endsWith(label)) await item.click();
    await settle();
  };
  const key = (target: Element, k: string) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

  describe('rows', () => {
    it("names each session with a button that selects it, and marks the active one's as current", async () => {
      const older = timer.createSession('Older');
      const newer = timer.createSession('Newer');
      await settle();
      expect(nameButton(newer)?.getAttribute('aria-current')).toBe('true');
      expect(nameButton(older)?.hasAttribute('aria-current')).toBe(false);
      nameButton(older)!.click();
      await settle();
      expect(timer.activeSession()?.id).toBe(older);
      expect(nameButton(older)?.getAttribute('aria-current')).toBe('true');
    });

    it('gives the row menu trigger a target of at least 24px', async () => {
      timer.createSession('One');
      await settle();
      const trigger = el('button[aria-label="Session actions"]')!;
      expect(trigger.getAttribute('data-size')).toBe('sm');
    });
  });

  describe('rename', () => {
    it('moves focus into the name field when Rename is chosen from the row menu', async () => {
      timer.createSession('Practice');
      await settle();
      await choose(0, 'Rename');
      expect(nameInput()).not.toBeNull();
      expect(document.activeElement).toBe(nameInput());
      expect(nameInput()!.value).toBe('Practice');
    });

    it('commits on Enter and puts focus back on the renamed session', async () => {
      const id = timer.createSession('Practice');
      await settle();
      await choose(0, 'Rename');
      const input = nameInput()!;
      input.value = 'Qualifying';
      input.dispatchEvent(new Event('input'));
      key(input, 'Enter');
      await settle();
      expect(timer.sessions()[0].name).toBe('Qualifying');
      expect(nameInput()).toBeNull();
      expect(document.activeElement).toBe(nameButton(id));
    });

    it('cancels on Escape and puts focus back on the session', async () => {
      const id = timer.createSession('Practice');
      await settle();
      await choose(0, 'Rename');
      const input = nameInput()!;
      input.value = 'Qualifying';
      input.dispatchEvent(new Event('input'));
      key(input, 'Escape');
      await settle();
      expect(timer.sessions()[0].name).toBe('Practice');
      expect(document.activeElement).toBe(nameButton(id));
    });
  });

  describe('focus after removing sessions', () => {
    it('moves focus to the next session after one is deleted from its menu', async () => {
      const older = timer.createSession('Older');
      timer.createSession('Newer');
      await settle();
      await choose(0, 'Delete');
      expect(timer.sessions().map((s) => s.name)).toEqual(['Older']);
      expect(document.activeElement).toBe(nameButton(older));
    });

    it('moves focus to the previous session when the last row is deleted after confirming', async () => {
      let clock = Date.now();
      vi.spyOn(Date, 'now').mockImplementation(() => (clock += 1000));
      timer.createSession('Older');
      timer.start();
      timer.lap();
      timer.stop();
      const newer = timer.createSession('Newer');
      vi.mocked(Date.now).mockRestore();
      expect(timer.sessions()[1].laps.length).toBeGreaterThan(0);
      await settle();
      const confirm = vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockReturnValue(undefined);
      await choose(1, 'Delete');
      const [[options]] = confirm.mock.calls as [[ConfirmOptions]];
      options.accept?.();
      await settle();
      expect(timer.sessions().map((s) => s.name)).toEqual(['Newer']);
      expect(document.activeElement).toBe(nameButton(newer));
    });

    it('moves focus to New Session once the only session is deleted', async () => {
      timer.createSession('Only');
      await settle();
      await choose(0, 'Delete');
      expect(timer.sessions()).toEqual([]);
      expect(document.activeElement).toBe(newSessionButton());
    });

    it('moves focus to New Session after Clear All is confirmed, instead of dropping it to the page', async () => {
      timer.createSession('One');
      timer.createSession('Two');
      await settle();
      const confirm = vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockReturnValue(undefined);
      const clearAll = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Clear All'
      )!;
      clearAll.click();
      const [[options]] = confirm.mock.calls as [[ConfirmOptions]];
      options.accept?.();
      await settle();
      expect(timer.sessions()).toEqual([]);
      expect(document.activeElement).toBe(newSessionButton());
    });
  });
});
