import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WhatsAppService {
  openChat(message?: string): void {
    const text = encodeURIComponent(message || environment.whatsappDefaultMessage);
    const url = `https://wa.me/${environment.whatsappNumber}?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  getLeadMessage(name: string, leadType: string): string {
    return `Hi Valahatti Technologies, I'm ${name}. I submitted a ${leadType} request on your website. Please connect with me.`;
  }
}
