/**
 * Public-facing contact details.
 *
 * The email is published deliberately (footer, contact page and the
 * `Organization` contactPoint in `src/index.html`), so it lives in one place
 * rather than being retyped into each template. The WhatsApp number stays in
 * the environment files, because it differs per deploy target in principle and
 * is already consumed through `WhatsAppService`.
 */
export const CONTACT_EMAIL = 'valahatti.tech@gmail.com';

/** `mailto:` href for the published address. */
export const CONTACT_EMAIL_HREF = `mailto:${CONTACT_EMAIL}`;
