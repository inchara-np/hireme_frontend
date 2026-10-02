import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';

import { SeoService } from './seo.service';
import { StructuredDataService } from './structured-data.service';
import { environment } from '../../../environments/environment';

describe('StructuredDataService', () => {
  let service: StructuredDataService;
  let doc: Document;

  const origin = environment.siteUrl.replace(/\/+$/, '');

  const scripts = () =>
    Array.from(
      doc.head.querySelectorAll<HTMLScriptElement>('script[data-ld="page"]')
    );

  /** The parsed `@graph` of the single managed script, or `null` if none. */
  const graph = (): Record<string, unknown>[] | null => {
    const el = scripts()[0];
    if (!el?.textContent) {
      return null;
    }
    const parsed = JSON.parse(el.textContent.replace(/\\u003C/g, '<'));
    return parsed['@graph'];
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StructuredDataService, SeoService]
    });

    service = TestBed.inject(StructuredDataService);
    doc = TestBed.inject(DOCUMENT);

    scripts().forEach((el) => el.remove());
  });

  afterEach(() => {
    scripts().forEach((el) => el.remove());
    doc.head
      .querySelectorAll('link[rel="canonical"]')
      .forEach((el) => el.remove());
  });

  // --------------------------------------------------------------- lifecycle
  describe('apply', () => {
    it('writes one ld+json script wrapping the nodes in a @graph', () => {
      service.apply([{ '@type': 'Service', name: 'Thing' }]);

      const el = scripts()[0];
      expect(scripts().length).toBe(1);
      expect(el.getAttribute('type')).toBe('application/ld+json');

      const parsed = JSON.parse(el.textContent ?? '{}');
      expect(parsed['@context']).toBe('https://schema.org');
      expect(parsed['@graph'].length).toBe(1);
    });

    it('replaces the previous graph instead of stacking a second script', () => {
      service.apply([{ '@type': 'Service', name: 'First' }]);
      service.apply([{ '@type': 'FAQPage', name: 'Second' }]);

      expect(scripts().length).toBe(1);
      expect(graph()?.[0]['@type']).toBe('FAQPage');
    });

    it('emits nothing at all for an empty node list', () => {
      service.apply([{ '@type': 'Service' }]);
      service.apply([]);

      expect(scripts().length).toBe(0);
    });

    it('clear() removes the managed script', () => {
      service.apply([{ '@type': 'Service' }]);
      service.clear();

      expect(scripts().length).toBe(0);
    });

    it('escapes < so copy can never terminate the script block early', () => {
      service.apply([{ '@type': 'Thing', name: 'a </script> b' }]);

      const raw = scripts()[0].textContent ?? '';
      expect(raw).not.toContain('</script>');
      expect(raw).toContain('\\u003C/script>');
    });
  });

  // ------------------------------------------------------------------- urls
  describe('absoluteUrl', () => {
    it('resolves a path against the canonical apex origin', () => {
      expect(service.absoluteUrl('/services')).toBe(`${origin}/services`);
    });

    it('keeps the bare root as a single slash', () => {
      expect(service.absoluteUrl('/')).toBe(`${origin}/`);
    });

    it('strips query strings and fragments', () => {
      expect(service.absoluteUrl('/contact?type=freelance#form')).toBe(
        `${origin}/contact`
      );
    });

    it('matches the canonical URL SeoService writes for the same path', () => {
      const seo = TestBed.inject(SeoService);
      seo.update({ title: 't', description: 'd', path: '/student-projects' });

      const canonical =
        doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ??
        '';

      expect(canonical).not.toBe('');
      expect(service.absoluteUrl('/student-projects')).toBe(canonical);
    });
  });

  // ------------------------------------------------------------------ nodes
  describe('breadcrumbs', () => {
    it('numbers the trail from one and makes every item absolute', () => {
      service.apply([
        service.breadcrumbs([
          { name: 'Home', path: '/' },
          { name: 'Services', path: '/services' },
          { name: 'Final year project help', path: '/student-projects' }
        ])
      ]);

      const node = graph()?.[0] as {
        '@id': string;
        itemListElement: { position: number; name: string; item: string }[];
      };

      expect(node['@id']).toBe(`${origin}/student-projects#breadcrumbs`);
      expect(node.itemListElement.map((i) => i.position)).toEqual([1, 2, 3]);
      expect(node.itemListElement[0].item).toBe(`${origin}/`);
      expect(node.itemListElement[2].name).toBe('Final year project help');
    });
  });

  describe('service', () => {
    it('derives @id and url from the path and credits the Organization', () => {
      service.apply([
        service.service({
          path: '/freelance-services',
          name: 'Freelance development',
          serviceType: 'Custom web application development',
          description: 'd',
          offers: ['MVP development for startups']
        })
      ]);

      const node = graph()?.[0] as Record<string, any>;

      expect(node['@type']).toBe('Service');
      expect(node['@id']).toBe(`${origin}/freelance-services#service`);
      expect(node['url']).toBe(`${origin}/freelance-services`);
      expect(node['provider']['@id']).toBe(`${origin}/#organization`);
      expect(node['hasOfferCatalog'].itemListElement.length).toBe(1);
    });

    it('is national: areaServed is India, with no city or geo data', () => {
      service.apply([
        service.service({
          path: '/services',
          name: 'n',
          serviceType: 't',
          description: 'd'
        })
      ]);

      const node = graph()?.[0] as Record<string, any>;

      expect(node['areaServed']).toEqual({ '@type': 'Country', name: 'India' });
      expect(JSON.stringify(node)).not.toContain('LocalBusiness');
      expect(node['address']).toBeUndefined();
      expect(node['geo']).toBeUndefined();
    });

    it('never publishes a price', () => {
      service.apply([
        service.service({
          path: '/services',
          name: 'n',
          serviceType: 't',
          description: 'd',
          offers: ['Custom web application development']
        })
      ]);

      // Offers name the sub-service only. Publishing a price the owner has
      // not quoted would be a fabricated claim, and a wrong one in Search.
      const offer = (graph()?.[0] as Record<string, any>)['hasOfferCatalog']
        .itemListElement[0];

      expect(Object.keys(offer)).toEqual(['@type', 'itemOffered']);
      expect(JSON.stringify(graph())).not.toContain('price');
    });

    it('omits hasOfferCatalog when there are no named offers', () => {
      service.apply([
        service.service({
          path: '/services',
          name: 'n',
          serviceType: 't',
          description: 'd'
        })
      ]);

      expect((graph()?.[0] as Record<string, unknown>)['hasOfferCatalog'])
        .toBeUndefined();
    });
  });

  describe('faqPage', () => {
    it('maps each entry to a Question with an acceptedAnswer, in order', () => {
      const entries = [
        { question: 'Will I get the source code?', answer: 'Yes, all of it.' },
        { question: 'How much does it cost?', answer: 'It depends on scope.' }
      ];

      service.apply([service.faqPage('/student-projects', entries)]);

      const node = graph()?.[0] as Record<string, any>;

      expect(node['@type']).toBe('FAQPage');
      expect(node['@id']).toBe(`${origin}/student-projects#faq`);
      expect(node['mainEntity'].length).toBe(2);
      expect(node['mainEntity'][0].name).toBe(entries[0].question);
      expect(node['mainEntity'][0].acceptedAnswer).toEqual({
        '@type': 'Answer',
        text: entries[0].answer
      });
      expect(node['mainEntity'][1].name).toBe(entries[1].question);
    });
  });

  describe('contactPage', () => {
    it('publishes the email on both the Organization and its contactPoint', () => {
      service.apply([
        service.contactPage('/contact', 'Contact us', 'hello@example.com')
      ]);

      const node = graph()?.[0] as Record<string, any>;

      expect(node['@type']).toBe('ContactPage');
      expect(node['mainEntity'].email).toBe('hello@example.com');
      expect(node['mainEntity'].contactPoint.email).toBe('hello@example.com');
      expect(node['mainEntity']['@id']).toBe(`${origin}/#organization`);
    });
  });

  // ----------------------------------------------------- SeoService coupling
  it('is cleared when SeoService marks a route noindex', () => {
    service.apply([service.faqPage('/student-projects', [])]);
    expect(scripts().length).toBe(1);

    TestBed.inject(SeoService).setNoIndex('Dashboard', '/admin/dashboard');

    expect(scripts().length).toBe(0);
  });

  it('is left alone on an indexable route', () => {
    service.apply([service.faqPage('/student-projects', [])]);

    TestBed.inject(SeoService).update({
      title: 't',
      description: 'd',
      path: '/student-projects'
    });

    expect(scripts().length).toBe(1);
  });
});
