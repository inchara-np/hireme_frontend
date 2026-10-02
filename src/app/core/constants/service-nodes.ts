import { ServiceNode } from '../services/structured-data.service';

/**
 * The studio's two `Service` entities, defined once.
 *
 * `/services` is a hub that describes both, and `/student-projects` and
 * `/freelance-services` each describe one. Because `StructuredDataService`
 * derives the node's `@id` from its path, emitting these objects from more
 * than one route describes the *same* entity rather than creating a second,
 * subtly different copy of it — which is exactly what you want and exactly
 * what hand-written duplicates get wrong.
 */
export const ACADEMIC_PROJECT_SERVICE: ServiceNode = {
  path: '/student-projects',
  name: 'Final year project help with source code, report and PPT',
  serviceType: 'Academic project development',
  description:
    'Academic project development for engineering and computer-application students across India: mini, major, final year and IEEE-based projects delivered with complete source code, setup instructions, a project report and PPT in the department format, and a viva walkthrough.',
  offers: [
    'Final year project development',
    'Mini project development',
    'Major project development',
    'IEEE paper based project implementation',
    'Project report and PPT preparation',
    'Viva preparation walkthrough'
  ]
};

export const FREELANCE_DEVELOPMENT_SERVICE: ServiceNode = {
  path: '/freelance-services',
  name: 'Freelance full stack web application development',
  serviceType: 'Custom web application development',
  description:
    'Freelance and contract software development for businesses, founders and small teams across India: custom web applications, MVPs, REST APIs and dashboards in Angular, Go and PostgreSQL, delivered with deployment and a documented handover.',
  offers: [
    'Custom web application development',
    'MVP development for startups',
    'Website development for small business',
    'Angular front-end development',
    'Go and PostgreSQL backend development',
    'REST API development',
    'Code review and architecture consulting',
    'Deployment and DevOps handover'
  ]
};
