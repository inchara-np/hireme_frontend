import { Component, inject } from '@angular/core';

import { WhatsAppService } from '../../../core/services/whatsapp.service';

@Component({
  selector: 'app-whatsapp-button',
  standalone: true,
  imports: [],
  templateUrl: './whatsapp-button.component.html',
  styleUrl: './whatsapp-button.component.scss'
})
export class WhatsAppButtonComponent {
  private readonly whatsapp = inject(WhatsAppService);

  chat(): void {
    this.whatsapp.openChat();
  }
}
