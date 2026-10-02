import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Injectable,
  PLATFORM_ID,
  computed,
  inject,
  signal
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const THEME_CLASSES = ['light-theme', 'dark-theme'] as const;

/**
 * Light/dark theme state.
 *
 * Works with the tiny inline script in `index.html`, which applies the stored
 * (or system-preferred) theme class to `<html>` before first paint so dark-mode
 * visitors never see a white flash. This service adopts whatever that script
 * decided rather than re-deciding it, then owns every change afterwards.
 *
 * All colour values live in `src/styles/_tokens.scss`; the only thing toggled
 * here is which class is on the root element.
 */
@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  private readonly themeSignal = signal<Theme>('light');

  /** Current theme, as a signal — preferred in new components. */
  readonly theme = this.themeSignal.asReadonly();

  readonly isDark = computed(() => this.themeSignal() === 'dark');

  /** Kept for consumers that still want an observable. */
  readonly theme$ = toObservable(this.themeSignal);

  initialize(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.setTheme(this.resolveInitialTheme());
    this.watchSystemPreference();
  }

  toggleTheme(): void {
    this.setTheme(this.themeSignal() === 'light' ? 'dark' : 'light');
  }

  setTheme(theme: Theme): void {
    this.themeSignal.set(theme);

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.safeStorage(() => localStorage.setItem(STORAGE_KEY, theme));
    this.applyThemeClass(theme);
  }

  getCurrentTheme(): Theme {
    return this.themeSignal();
  }

  isDarkMode(): boolean {
    return this.isDark();
  }

  // ---------------------------------------------------------------- internals

  private resolveInitialTheme(): Theme {
    const stored = this.safeStorage(() => localStorage.getItem(STORAGE_KEY));
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }

    // No explicit choice yet — follow the operating system.
    return this.prefersDark() ? 'dark' : 'light';
  }

  private prefersDark(): boolean {
    const win = this.document.defaultView;
    return !!win?.matchMedia?.('(prefers-color-scheme: dark)').matches;
  }

  /**
   * Follows the OS until the visitor makes an explicit choice, after which
   * their stored preference wins.
   */
  private watchSystemPreference(): void {
    const media = this.document.defaultView?.matchMedia?.(
      '(prefers-color-scheme: dark)'
    );
    if (!media?.addEventListener) {
      return;
    }

    media.addEventListener('change', (event) => {
      const stored = this.safeStorage(() => localStorage.getItem(STORAGE_KEY));
      if (stored !== 'dark' && stored !== 'light') {
        this.applyThemeClass(event.matches ? 'dark' : 'light');
        this.themeSignal.set(event.matches ? 'dark' : 'light');
      }
    });
  }

  private applyThemeClass(theme: Theme): void {
    const root = this.document.documentElement;
    const body = this.document.body;

    root.classList.remove(...THEME_CLASSES);
    body?.classList.remove(...THEME_CLASSES);

    root.classList.add(`${theme}-theme`);
    body?.classList.add(`${theme}-theme`);

    // Keeps native form controls, scrollbars and the UA's own surfaces in
    // step with the app's theme.
    root.style.colorScheme = theme;
  }

  /** localStorage throws in private mode / when cookies are blocked. */
  private safeStorage<T>(fn: () => T): T | null {
    try {
      return fn();
    } catch {
      return null;
    }
  }
}
