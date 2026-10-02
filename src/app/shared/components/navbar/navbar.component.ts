import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  HostListener,
  PLATFORM_ID,
  inject,
  signal
} from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive
} from '@angular/router';
import { filter } from 'rxjs/operators';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';

interface NavItem {
  path: string;
  label: string;
  exact?: boolean;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ThemeToggleComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly menuOpen = signal(false);
  /** Drives the elevated/condensed state once the page scrolls. */
  readonly scrolled = signal(false);

  readonly navItems: NavItem[] = [
    { path: '/', label: 'Home', exact: true },
    { path: '/services', label: 'Services' },
    { path: '/student-projects', label: 'Student Projects' },
    { path: '/freelance-services', label: 'Freelance' },
    { path: '/contact', label: 'Contact' }
  ];

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.closeMenu());
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
    this.lockBodyScroll(this.menuOpen());
  }

  closeMenu(): void {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
      this.lockBodyScroll(false);
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.scrolled.set(window.scrollY > 8);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
  }

  /** Stops the page behind the mobile drawer from scrolling. */
  private lockBodyScroll(locked: boolean): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    document.body.style.overflow = locked ? 'hidden' : '';
  }
}
