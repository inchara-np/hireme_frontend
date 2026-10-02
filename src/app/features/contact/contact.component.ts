import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { finalize } from 'rxjs/operators';

import {
  CONTACT_EMAIL,
  CONTACT_EMAIL_HREF
} from '../../core/constants/site.constants';
import { LeadService } from '../../core/services/lead.service';
import { SeoService } from '../../core/services/seo.service';
import { StructuredDataService } from '../../core/services/structured-data.service';
import { WhatsAppService } from '../../core/services/whatsapp.service';
import {
  LEAD_TYPE,
  LeadRequest,
  LeadType
} from '../../core/models/lead.model';
import { errorMessage } from '../../core/models/app-error.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import {
  errorFor,
  firstInvalidControl,
  showError
} from '../../shared/utils/form-errors';

/** Per-variant copy and SEO, keyed off the `?type=` query parameter. */
const VARIANTS: Record<
  string,
  { leadType: LeadType; kicker: string; title: string; subtitle: string }
> = {
  freelance: {
    leadType: LEAD_TYPE.Freelance,
    kicker: 'Freelance enquiry',
    title: 'Hire us for your next build',
    subtitle:
      'Share the scope, the deadline and a rough budget. You will get a written plan back within 24 hours.'
  },
  business: {
    leadType: LEAD_TYPE.Business,
    kicker: 'Business enquiry',
    title: 'Start your project',
    subtitle:
      'Tell us what the software needs to do and who it is for. We will come back with an approach, a timeline and a cost.'
  }
};

const DEFAULT_VARIANT = {
  leadType: LEAD_TYPE.Contact as LeadType,
  kicker: 'Contact',
  title: 'Get a quote for your project',
  subtitle:
    'One form for every kind of enquiry — final year project help, freelance development work, or a question before you commit to anything. Email or WhatsApp works too.'
};

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent, AlertComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly leadService = inject(LeadService);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly structuredData = inject(StructuredDataService);
  private readonly whatsapp = inject(WhatsAppService);
  private readonly platformId = inject(PLATFORM_ID);

  /** Published deliberately — see `site.constants.ts`. */
  readonly email = CONTACT_EMAIL;
  readonly emailHref = CONTACT_EMAIL_HREF;
  readonly whatsappHref = this.whatsapp.buildUrl();

  readonly contactForm: FormGroup;

  readonly isSubmitting = signal(false);
  readonly submitError = signal('');
  readonly submitSuccess = signal('');

  leadType: LeadType = DEFAULT_VARIANT.leadType;
  kicker = DEFAULT_VARIANT.kicker;
  pageTitle = DEFAULT_VARIANT.title;
  pageSubtitle = DEFAULT_VARIANT.subtitle;

  readonly assurances = [
    'A reply within 24 hours, on a working day',
    'A written scope before any work starts',
    'Direct contact with the developer, not a sales desk',
    'No cost and no obligation for the first conversation'
  ];

  constructor() {
    this.contactForm = this.fb.group({
      name: [
        '',
        [Validators.required, Validators.minLength(2), Validators.maxLength(100)]
      ],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
      company: ['', Validators.maxLength(150)],
      message: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(5000)
        ]
      ]
    });
  }

  ngOnInit(): void {
    const type = this.route.snapshot.queryParamMap.get('type') ?? '';
    const variant = VARIANTS[type] ?? DEFAULT_VARIANT;

    this.leadType = variant.leadType;
    this.kicker = variant.kicker;
    this.pageTitle = variant.title;
    this.pageSubtitle = variant.subtitle;

    // Canonical always points at bare /contact — the ?type= variants are the
    // same page with different copy and must not compete in search results.
    this.seo.update({
      title: 'Contact — Get a Project Quote',
      description: `Email ${CONTACT_EMAIL}, message us on WhatsApp or send the form to get a quote for a final year project or a custom web app within 24 hours.`,
      path: '/contact',
      keywords:
        'contact software developer India, get project quote, hire freelance full stack developer India, final year project help, custom web application development enquiry'
    });

    this.structuredData.apply([
      this.structuredData.breadcrumbs([
        { name: 'Home', path: '/' },
        { name: 'Contact', path: '/contact' }
      ]),
      this.structuredData.contactPage(
        '/contact',
        'Contact Valahatti Technologies',
        CONTACT_EMAIL
      )
    ]);
  }

  // ------------------------------------------------------------- validation
  isInvalid(controlName: string): boolean {
    return showError(this.contactForm, controlName);
  }

  getError(controlName: string): string {
    return errorFor(this.contactForm, controlName);
  }

  /**
   * Trims a text field when the user leaves it.
   *
   * Angular's `Validators.email` rejects leading/trailing whitespace, so a
   * pasted address like "  you@example.com " would otherwise show a confusing
   * "enter a valid email" error. Normalising on blur fixes the value instead
   * of blaming the user for it.
   */
  trimField(controlName: string): void {
    const control = this.contactForm.get(controlName);
    const value = control?.value;
    if (typeof value !== 'string') {
      return;
    }
    const trimmed = value.trim();
    if (trimmed !== value) {
      control?.setValue(trimmed);
    }
  }

  get message(): AbstractControl | null {
    return this.contactForm.get('message');
  }

  get messageLength(): number {
    return (this.message?.value as string | null)?.length ?? 0;
  }

  // ----------------------------------------------------------------- submit
  submit(): void {
    this.submitError.set('');
    this.submitSuccess.set('');

    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      this.focusFirstError();
      return;
    }

    this.isSubmitting.set(true);

    const value = this.contactForm.getRawValue();
    const payload: LeadRequest = {
      lead_type: this.leadType,
      name: value.name.trim(),
      email: value.email.trim(),
      phone: value.phone.trim(),
      company: value.company?.trim() || '',
      description: value.message.trim(),
      attachments: []
    };

    this.leadService
      .createLead(payload)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.submitSuccess.set(
            "Thanks — your message is in. We'll reply to the email and phone number you gave within 24 hours."
          );
          this.contactForm.reset();
          this.scrollToFeedback();
        },
        error: (error: unknown) => {
          // Errors arrive already normalised by httpErrorInterceptor; only the
          // wording that is specific to this form is overridden here.
          this.submitError.set(
            errorMessage(error, {
              validation:
                'Some details were rejected. Check the phone number and email, then send again.',
              rateLimit:
                'That is a lot of messages in a short time. Please wait a minute and send again.',
              network:
                "We couldn't reach the server. Check your connection — or message us on WhatsApp instead."
            })
          );
          this.scrollToFeedback();
        }
      });
  }

  // -------------------------------------------------------------- internals
  private focusFirstError(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const first = firstInvalidControl(this.contactForm);
    if (!first) {
      return;
    }
    const el = document.getElementById(`contact-${first}`);
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  private scrollToFeedback(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    // Wait a tick so the alert exists before scrolling to it.
    setTimeout(() =>
      document
        .querySelector('.contact__feedback')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    );
  }
}
