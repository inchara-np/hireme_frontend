import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { WhatsAppButtonComponent } from './shared/components/whatsapp-button/whatsapp-button.component';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    NavbarComponent,
    FooterComponent,
    WhatsAppButtonComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  /**
   * Public chrome (navbar, footer, WhatsApp button) is hidden inside `/admin`,
   * which brings its own sidebar layout.
   */
  readonly showPublicChrome = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => !event.urlAfterRedirects.startsWith('/admin')),
      startWith(!this.router.url.startsWith('/admin'))
    ),
    { initialValue: true }
  );

  constructor() {
    this.themeService.initialize();
  }
}
