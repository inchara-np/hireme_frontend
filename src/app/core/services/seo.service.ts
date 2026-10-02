import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import { environment } from '../../../environments/environment';
import { StructuredDataService } from './structured-data.service';

export interface SeoConfig {
  /** Page title, without the brand suffix. */
  title: string;
  description: string;
  /**
   * Route path the canonical URL should point at, e.g. `/services`.
   * Always resolved against the apex host and stripped of query parameters,
   * so `?type=freelance` variants never split ranking signals.
   */
  path: string;
  /** Absolute or root-relative image for og:image / twitter:image. */
  image?: string;
  imageAlt?: string;
  /** og:type — `website` for landing pages, `article` for content. */
  type?: 'website' | 'article';
  /** Emits `noindex, nofollow`. Used by every admin route. */
  noIndex?: boolean;
  /** Appended to the title as "<title> | <brand>". Pass '' to suppress. */
  titleSuffix?: string;
  keywords?: string;
}

const BRAND = 'Valahatti Technologies';
const DEFAULT_IMAGE = '/og-image.png';
const DEFAULT_IMAGE_ALT =
  'Valahatti Technologies — academic projects and freelance engineering';

/**
 * Sets the document title, meta description, canonical link and the full
 * Open Graph / Twitter card set in a single call.
 *
 * Canonical URLs are always built against the apex host configured in
 * `environment.siteUrl` (`https://valahatti-tech.com`), regardless of the host
 * or query string the visitor arrived on. Cloudflare still needs a dashboard
 * redirect rule to send `www.` to the apex — see the README.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly structuredData = inject(StructuredDataService);

  /** Apex origin with no trailing slash, e.g. `https://valahatti-tech.com`. */
  private readonly origin = environment.siteUrl.replace(/\/+$/, '');

  update(config: SeoConfig): void {
    const suffix = config.titleSuffix ?? BRAND;
    const fullTitle = suffix ? `${config.title} | ${suffix}` : config.title;
    const canonical = this.absoluteUrl(config.path);
    const image = this.absoluteUrl(config.image ?? DEFAULT_IMAGE);

    this.title.setTitle(fullTitle);

    this.setName('description', config.description);
    if (config.keywords) {
      this.setName('keywords', config.keywords);
    } else {
      this.meta.removeTag("name='keywords'");
    }

    // Robots: noindex wins outright for admin screens.
    this.setName(
      'robots',
      config.noIndex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    );

    this.setCanonical(canonical);

    // A noindex route must not leave the previous page's JSON-LD behind: the
    // admin screens and the 404 page describe nothing worth marking up, and a
    // stale FAQPage attached to the wrong URL is worse than none.
    if (config.noIndex) {
      this.structuredData.clear();
    }

    // --- Open Graph ---
    this.setProperty('og:title', fullTitle);
    this.setProperty('og:description', config.description);
    this.setProperty('og:url', canonical);
    this.setProperty('og:type', config.type ?? 'website');
    this.setProperty('og:site_name', BRAND);
    this.setProperty('og:locale', 'en_IN');
    this.setProperty('og:image', image);
    this.setProperty('og:image:alt', config.imageAlt ?? DEFAULT_IMAGE_ALT);
    this.setProperty('og:image:width', '1200');
    this.setProperty('og:image:height', '630');

    // --- Twitter ---
    this.setName('twitter:card', 'summary_large_image');
    this.setName('twitter:title', fullTitle);
    this.setName('twitter:description', config.description);
    this.setName('twitter:image', image);
    this.setName('twitter:image:alt', config.imageAlt ?? DEFAULT_IMAGE_ALT);
  }

  /** Convenience wrapper for the admin panel. */
  setNoIndex(title: string, path: string): void {
    this.update({
      title,
      description: `${title} — internal admin area for ${BRAND}.`,
      path,
      noIndex: true,
      titleSuffix: `${BRAND} Admin`
    });
  }

  /**
   * Resolves a path or absolute URL against the canonical apex origin,
   * discarding any query string or fragment.
   */
  private absoluteUrl(pathOrUrl: string): string {
    let path = pathOrUrl ?? '/';

    if (/^https?:\/\//i.test(path)) {
      try {
        path = new URL(path).pathname;
      } catch {
        path = '/';
      }
    }

    // Drop query + hash: canonical must not vary with ?type=freelance etc.
    path = path.split('?')[0].split('#')[0];

    if (!path.startsWith('/')) {
      path = `/${path}`;
    }

    // Collapse a trailing slash on sub-paths; keep the bare root as "/".
    if (path.length > 1) {
      path = path.replace(/\/+$/, '');
    }

    return `${this.origin}${path === '/' ? '/' : path}`;
  }

  private setName(name: string, content: string): void {
    this.meta.updateTag({ name, content });
  }

  private setProperty(property: string, content: string): void {
    this.meta.updateTag({ property, content }, `property='${property}'`);
  }

  /** Upserts a single `<link rel="canonical">` in the document head. */
  private setCanonical(href: string): void {
    const head = this.document.head;
    if (!head) {
      return;
    }

    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', href);
  }
}
