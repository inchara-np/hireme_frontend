import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  CONTACT_EMAIL,
  CONTACT_EMAIL_HREF
} from '../../../core/constants/site.constants';
import { WhatsAppService } from '../../../core/services/whatsapp.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  // RouterLink was previously missing here, which silently turned every footer
  // link into a dead anchor.
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  private readonly whatsapp = inject(WhatsAppService);

  readonly year = new Date().getFullYear();
  readonly whatsappHref = this.whatsapp.buildUrl();

  /** Published deliberately — see `site.constants.ts`. */
  readonly email = CONTACT_EMAIL;
  readonly emailHref = CONTACT_EMAIL_HREF;

  /**
   * Descriptive anchor text, not menu labels. These links appear on every
   * page, so what they say is the strongest signal the site gives about what
   * each destination page is for.
   */
  readonly serviceLinks = [
    { path: '/student-projects', label: 'Final year project help' },
    { path: '/freelance-services', label: 'Hire a freelance developer' },
    { path: '/services', label: 'All development services' }
  ];

  readonly companyLinks = [
    { path: '/', label: 'Home' },
    { path: '/contact', label: 'Contact & quote request' }
  ];
}
