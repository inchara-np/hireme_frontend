import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';

/** One visible question/answer pair, mirrored into `FAQPage` JSON-LD. */
export interface FaqEntry {
  question: string;
  answer: string;
}

/** A single step in a breadcrumb trail, ordered root-first. */
export interface Crumb {
  name: string;
  path: string;
}

export interface ServiceNode {
  /** Fragment-less path the service is described on, e.g. `/student-projects`. */
  path: string;
  name: string;
  description: string;
  /** Free-text category, e.g. `Academic project development`. */
  serviceType: string;
  /** Named sub-services. Rendered as an `OfferCatalog`; never priced. */
  offers?: string[];
}

const ORGANIZATION_ID = '#organization';
const MANAGED_SELECTOR = 'script[data-ld="page"]';

/**
 * Emits the per-page JSON-LD graph.
 *
 * Site-wide `Organization` and `WebSite` nodes live in `src/index.html` because
 * they never change. Everything that *does* vary per route — `BreadcrumbList`,
 * `Service`, `FAQPage`, `ContactPage` — is written here, as a single
 * `@graph` script tagged `data-ld="page"` so the next navigation can replace it
 * wholesale instead of stacking duplicates.
 *
 * `application/ld+json` is data, not script: `tools/csp-hashes.js` skips it,
 * so no CSP hash has to be regenerated when this content changes.
 */
@Injectable({ providedIn: 'root' })
export class StructuredDataService {
  private readonly document = inject(DOCUMENT);

  /** Apex origin with no trailing slash, matching `SeoService`. */
  private readonly origin = environment.siteUrl.replace(/\/+$/, '');

  /** Absolute URL for a route path on the canonical host. */
  absoluteUrl(path: string): string {
    const clean = (path || '/').split('?')[0].split('#')[0];
    const withSlash = clean.startsWith('/') ? clean : `/${clean}`;
    const trimmed =
      withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash;
    return `${this.origin}${trimmed}`;
  }

  /**
   * Replaces the page-level graph. Passing an empty array simply clears it,
   * which is what every `noindex` route wants.
   */
  apply(nodes: object[]): void {
    const head = this.document.head;
    if (!head) {
      return;
    }

    head.querySelectorAll(MANAGED_SELECTOR).forEach((el) => el.remove());

    if (!nodes.length) {
      return;
    }

    const script = this.document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.setAttribute('data-ld', 'page');
    script.textContent = serialise({
      '@context': 'https://schema.org',
      '@graph': nodes
    });
    head.appendChild(script);
  }

  /** Removes any page-level graph left behind by the previous route. */
  clear(): void {
    this.apply([]);
  }

  // ------------------------------------------------------------------ nodes
  /**
   * `BreadcrumbList` for a trail that starts at the home page.
   *
   * The trail is allowed to be deeper than the URL — `/student-projects` sits
   * under `/services` conceptually even though the path is flat — which is
   * explicitly supported by Google's breadcrumb guidance.
   */
  breadcrumbs(trail: Crumb[]): object {
    const last = trail[trail.length - 1];
    return {
      '@type': 'BreadcrumbList',
      '@id': `${this.absoluteUrl(last?.path ?? '/')}#breadcrumbs`,
      itemListElement: trail.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: this.absoluteUrl(crumb.path)
      }))
    };
  }

  /** `Service` provided by the studio, with no price or duration claims. */
  service(node: ServiceNode): object {
    const url = this.absoluteUrl(node.path);

    const base: Record<string, unknown> = {
      '@type': 'Service',
      '@id': `${url}#service`,
      name: node.name,
      serviceType: node.serviceType,
      description: node.description,
      url,
      provider: { '@id': `${this.origin}/${ORGANIZATION_ID}` },
      // All-India and remote: no city, no LocalBusiness, no geo coordinates.
      areaServed: { '@type': 'Country', name: 'India' },
      availableChannel: {
        '@type': 'ServiceChannel',
        name: 'Online enquiry form',
        serviceUrl: url
      }
    };

    if (node.offers?.length) {
      base['hasOfferCatalog'] = {
        '@type': 'OfferCatalog',
        name: node.name,
        itemListElement: node.offers.map((offer) => ({
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: offer }
        }))
      };
    }

    return base;
  }

  /** `FAQPage` mirroring the visible accordion on the same route. */
  faqPage(path: string, entries: FaqEntry[]): object {
    const url = this.absoluteUrl(path);
    return {
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      url,
      mainEntity: entries.map((entry) => ({
        '@type': 'Question',
        name: entry.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: entry.answer
        }
      }))
    };
  }

  /** `ContactPage` for `/contact`, carrying the published email. */
  contactPage(path: string, name: string, email: string): object {
    const url = this.absoluteUrl(path);
    return {
      '@type': 'ContactPage',
      '@id': `${url}#webpage`,
      url,
      name,
      isPartOf: { '@id': `${this.origin}/#website` },
      about: { '@id': `${this.origin}/${ORGANIZATION_ID}` },
      mainEntity: {
        '@type': 'Organization',
        '@id': `${this.origin}/${ORGANIZATION_ID}`,
        email,
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email,
          areaServed: 'IN',
          availableLanguage: 'English'
        }
      }
    };
  }
}

/**
 * JSON for an inline `<script>`.
 *
 * `undefined` values are dropped by `JSON.stringify`, and `<` is escaped so a
 * stray `</script>` in future copy can never terminate the block early.
 */
function serialise(graph: unknown): string {
  return JSON.stringify(graph).replace(/</g, '\\u003C');
}
