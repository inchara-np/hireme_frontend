import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { environment } from '../../../environments/environment';
import { LeadType, leadTypeLabel } from '../models/lead.model';

@Injectable({
  providedIn: 'root'
})
export class WhatsAppService {
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Opens WhatsApp in a new tab.
   *
   * Guarded with `isPlatformBrowser` for the same reason `ThemeService` is:
   * this runs during prerendering too, where `window` does not exist.
   */
  openChat(message?: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.open(this.buildUrl(message), '_blank', 'noopener,noreferrer');
  }

  /** The `https://wa.me/...` link, so templates can render a real anchor. */
  buildUrl(message?: string): string {
    const text = encodeURIComponent(
      message || environment.whatsappDefaultMessage
    );
    return `https://wa.me/${environment.whatsappNumber}?text=${text}`;
  }

  getLeadMessage(name: string, leadType: LeadType | string): string {
    const label = leadTypeLabel(leadType).toLowerCase();
    return `Hi Valahatti Technologies, I'm ${name}. I submitted a ${label} request on your website. Please connect with me.`;
  }
}
