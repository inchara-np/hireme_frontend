import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  private platformId = inject(PLATFORM_ID);

  private readonly storageKey = 'theme';

  private themeSubject =
    new BehaviorSubject<Theme>('light');

  theme$ = this.themeSubject.asObservable();

  initialize(): void {

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const savedTheme = localStorage.getItem(this.storageKey);
    const theme: Theme = savedTheme === 'dark' || savedTheme === 'light'
      ? savedTheme
      : 'light';

    this.setTheme(theme);
  }

  toggleTheme(): void {

    const current = this.themeSubject.value;

    const nextTheme: Theme =
      current === 'light'
        ? 'dark'
        : 'light';

    this.setTheme(nextTheme);
  }

  setTheme(theme: Theme): void {

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.themeSubject.next(theme);

    localStorage.setItem(
      this.storageKey,
      theme
    );

    document.documentElement.classList.remove('light-theme', 'dark-theme');
    document.body.classList.remove('light-theme', 'dark-theme');

    document.documentElement.classList.add(`${theme}-theme`);
    document.body.classList.add(`${theme}-theme`);
  }

  getCurrentTheme(): Theme {
    return this.themeSubject.value;
  }

  isDarkMode(): boolean {
    return this.themeSubject.value === 'dark';
  }
}