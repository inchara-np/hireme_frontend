import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FaqEntry } from '../../../core/services/structured-data.service';

/**
 * One FAQ row. Extends the structured-data shape so the same array can be
 * handed to `StructuredDataService.faqPage()` without being remapped — the
 * visible answer and the `FAQPage` answer can then never drift apart.
 */
export interface FaqItem extends FaqEntry {
  /** Optional internal link rendered under the answer. */
  linkPath?: string;
  /** Descriptive anchor text for `linkPath`. Required when it is set. */
  linkLabel?: string;
}

/**
 * Plain `<details>`/`<summary>` accordion.
 *
 * No JavaScript and no ARIA bookkeeping: the native disclosure widget is
 * already keyboard operable and announced correctly, and its content is in the
 * HTML whether it is open or closed — which is what lets the matching
 * `FAQPage` markup qualify for FAQ rich results.
 *
 * Each question is an `<h3>`, the one element `<summary>` is allowed to wrap,
 * so the page keeps a logical heading outline under the section's `<h2>`.
 */
@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.scss'
})
export class FaqComponent {
  @Input() items: readonly FaqItem[] = [];
}
