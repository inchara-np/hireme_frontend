import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { WhatsAppService } from '../../../core/services/whatsapp.service';

/**
 * Floating WhatsApp contact affordance shown on public pages.
 *
 * Rendered as a real anchor rather than a button so it works without JS, is
 * middle-clickable, and reads correctly to assistive technology.
 */
@Component({
  selector: 'app-whatsapp-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './whatsapp-button.component.html',
  styleUrl: './whatsapp-button.component.scss'
})
export class WhatsAppButtonComponent {
  private readonly whatsapp = inject(WhatsAppService);

  readonly href = this.whatsapp.buildUrl();
}
