import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Directive,
  ElementRef,
  Input,
  OnDestroy,
  PLATFORM_ID,
  inject
} from '@angular/core';

/**
 * Reveals an element once it scrolls into view.
 *
 * Deliberately conservative:
 *  - does nothing at all during prerendering (so prerendered HTML ships the
 *    content visible, which is what crawlers and no-JS visitors get),
 *  - does nothing when the visitor prefers reduced motion,
 *  - disconnects after the first reveal so nothing animates twice.
 */
@Directive({
  selector: '[appReveal]',
  standalone: true
})
export class RevealDirective implements AfterViewInit, OnDestroy {
  /** Stagger in ms, for revealing a row of cards in sequence. */
  @Input('appReveal') delay: number | string = 0;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const el = this.host.nativeElement as HTMLElement;

    const prefersReducedMotion =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const delay = Number(this.delay) || 0;
    if (delay > 0) {
      el.style.setProperty('--reveal-delay', `${delay}ms`);
    }

    // Added here rather than in the template so the element is never hidden
    // for visitors who never run this code path.
    el.classList.add('reveal');

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add('is-visible');
            this.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    this.observer.observe(el);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private disconnect(): void {
    this.observer?.disconnect();
    this.observer = undefined;
  }
}
