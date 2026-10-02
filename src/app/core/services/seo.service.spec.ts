import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';

import { SeoService } from './seo.service';
import { environment } from '../../../environments/environment';

describe('SeoService', () => {
  let service: SeoService;
  let title: Title;
  let meta: Meta;
  let doc: Document;

  const origin = environment.siteUrl.replace(/\/+$/, '');

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [SeoService] });

    service = TestBed.inject(SeoService);
    title = TestBed.inject(Title);
    meta = TestBed.inject(Meta);
    doc = TestBed.inject(DOCUMENT);

    doc.head
      .querySelectorAll('link[rel="canonical"]')
      .forEach((el) => el.remove());
  });

  afterEach(() => {
    doc.head
      .querySelectorAll('link[rel="canonical"]')
      .forEach((el) => el.remove());
    ['description', 'robots', 'keywords'].forEach((name) =>
      meta.removeTag(`name='${name}'`)
    );
  });

  const canonicalHref = () =>
    doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href');

  // ------------------------------------------------------------------ title
  it('appends the brand to the title', () => {
    service.update({ title: 'Services', description: 'd', path: '/services' });

    expect(title.getTitle()).toBe('Services | Valahatti Technologies');
  });

  it('omits the suffix when titleSuffix is empty', () => {
    service.update({
      title: 'Bare',
      description: 'd',
      path: '/x',
      titleSuffix: ''
    });

    expect(title.getTitle()).toBe('Bare');
  });

  // -------------------------------------------------------------- canonical
  describe('canonical URL', () => {
    it('builds an absolute URL on the configured apex host', () => {
      service.update({ title: 't', description: 'd', path: '/services' });

      expect(canonicalHref()).toBe(`${origin}/services`);
    });

    it('keeps the bare root as a single slash', () => {
      service.update({ title: 't', description: 'd', path: '/' });

      expect(canonicalHref()).toBe(`${origin}/`);
    });

    it('strips query parameters', () => {
      service.update({
        title: 't',
        description: 'd',
        path: '/contact?type=freelance'
      });

      expect(canonicalHref()).toBe(`${origin}/contact`);
    });

    it('strips hash fragments', () => {
      service.update({
        title: 't',
        description: 'd',
        path: '/freelance-services#engagement'
      });

      expect(canonicalHref()).toBe(`${origin}/freelance-services`);
    });

    it('rewrites a different host onto the apex host', () => {
      service.update({
        title: 't',
        description: 'd',
        path: 'https://www.valahatti-tech.com/services?utm_source=x'
      });

      expect(canonicalHref()).toBe(`${origin}/services`);
    });

    it('tolerates a path with no leading slash', () => {
      service.update({ title: 't', description: 'd', path: 'services' });

      expect(canonicalHref()).toBe(`${origin}/services`);
    });

    it('drops a trailing slash on sub-paths', () => {
      service.update({ title: 't', description: 'd', path: '/services/' });

      expect(canonicalHref()).toBe(`${origin}/services`);
    });

    it('updates the existing tag instead of adding a second one', () => {
      service.update({ title: 't', description: 'd', path: '/a' });
      service.update({ title: 't', description: 'd', path: '/b' });

      expect(doc.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
      expect(canonicalHref()).toBe(`${origin}/b`);
    });
  });

  // ------------------------------------------------------------------ robots
  describe('robots', () => {
    it('is indexable by default', () => {
      service.update({ title: 't', description: 'd', path: '/' });

      expect(meta.getTag("name='robots'")?.content).toContain('index, follow');
    });

    it('emits noindex, nofollow when asked', () => {
      service.update({
        title: 't',
        description: 'd',
        path: '/admin/leads',
        noIndex: true
      });

      expect(meta.getTag("name='robots'")?.content).toBe('noindex, nofollow');
    });

    it('setNoIndex marks admin pages noindex', () => {
      service.setNoIndex('Dashboard', '/admin/dashboard');

      expect(meta.getTag("name='robots'")?.content).toBe('noindex, nofollow');
      expect(title.getTitle()).toBe('Dashboard | Valahatti Technologies Admin');
    });
  });

  // ------------------------------------------------------- social meta tags
  describe('Open Graph and Twitter', () => {
    beforeEach(() => {
      service.update({
        title: 'Student Projects',
        description: 'Project help for engineering students.',
        path: '/student-projects'
      });
    });

    it('sets og:title to the full title', () => {
      expect(meta.getTag("property='og:title'")?.content).toBe(
        'Student Projects | Valahatti Technologies'
      );
    });

    it('points og:url at the canonical URL', () => {
      expect(meta.getTag("property='og:url'")?.content).toBe(
        `${origin}/student-projects`
      );
    });

    it('uses an absolute og:image', () => {
      const image = meta.getTag("property='og:image'")?.content;
      expect(image).toBe(`${origin}/og-image.png`);
    });

    it('declares og:image dimensions for link unfurling', () => {
      expect(meta.getTag("property='og:image:width'")?.content).toBe('1200');
      expect(meta.getTag("property='og:image:height'")?.content).toBe('630');
    });

    it('sets a large-image Twitter card', () => {
      expect(meta.getTag("name='twitter:card'")?.content).toBe(
        'summary_large_image'
      );
      expect(meta.getTag("name='twitter:description'")?.content).toBe(
        'Project help for engineering students.'
      );
    });

    it('updates tags in place across navigations', () => {
      service.update({ title: 'Contact', description: 'c', path: '/contact' });

      expect(
        doc.head.querySelectorAll("meta[property='og:title']").length
      ).toBe(1);
      expect(meta.getTag("property='og:title'")?.content).toBe(
        'Contact | Valahatti Technologies'
      );
    });
  });

  // ---------------------------------------------------------------- keywords
  it('removes stale keywords when a page supplies none', () => {
    service.update({
      title: 't',
      description: 'd',
      path: '/a',
      keywords: 'one, two'
    });
    expect(meta.getTag("name='keywords'")?.content).toBe('one, two');

    service.update({ title: 't', description: 'd', path: '/b' });
    expect(meta.getTag("name='keywords'")).toBeNull();
  });

  it('sets the meta description', () => {
    service.update({
      title: 't',
      description: 'A specific description.',
      path: '/a'
    });

    expect(meta.getTag("name='description'")?.content).toBe(
      'A specific description.'
    );
  });
});
