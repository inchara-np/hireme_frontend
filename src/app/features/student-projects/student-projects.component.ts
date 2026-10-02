import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';

import { ACADEMIC_PROJECT_SERVICE } from '../../core/constants/service-nodes';
import { LeadService } from '../../core/services/lead.service';
import { UploadService } from '../../core/services/upload.service';
import { SeoService } from '../../core/services/seo.service';
import { StructuredDataService } from '../../core/services/structured-data.service';
import {
  BRANCH_OPTIONS,
  LEAD_TYPE,
  LeadRequest,
  PROJECT_TYPE_OPTIONS,
  PROJECT_URGENCY_OPTIONS
} from '../../core/models/lead.model';
import { errorMessage, isAppError } from '../../core/models/app-error.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import {
  FaqComponent,
  FaqItem
} from '../../shared/components/faq/faq.component';
import {
  errorFor,
  firstInvalidControl,
  showError
} from '../../shared/utils/form-errors';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;
const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.zip'
];

@Component({
  selector: 'app-student-projects',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    AlertComponent,
    FaqComponent
  ],
  templateUrl: './student-projects.component.html',
  styleUrl: './student-projects.component.scss'
})
export class StudentProjectsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly leadService = inject(LeadService);
  private readonly uploadService = inject(UploadService);
  private readonly seo = inject(SeoService);
  private readonly structuredData = inject(StructuredDataService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly projectForm: FormGroup;

  readonly branchOptions = BRANCH_OPTIONS;
  readonly projectTypeOptions = PROJECT_TYPE_OPTIONS;
  readonly urgencyOptions = PROJECT_URGENCY_OPTIONS;

  readonly selectedFiles = signal<File[]>([]);
  readonly fileError = signal('');
  readonly isSubmitting = signal(false);
  readonly submitError = signal('');
  readonly submitSuccess = signal('');

  readonly maxFiles = MAX_FILES;
  readonly acceptAttr = ALLOWED_EXTENSIONS.join(',');

  readonly deliverables = [
    'Complete, working source code',
    'Project report and PPT support',
    'Setup and run instructions',
    'A walkthrough so you can explain every part at your viva'
  ];

  /** The four deliverables, written out properly rather than as bullets. */
  readonly included = [
    {
      title: 'Complete, working source code',
      body: "The full codebase, not a recorded demo or a half-finished build. You get every file, the database schema and migrations, and setup instructions that name the exact versions to install and the order to install them in — so it runs on your laptop and on the lab machine."
    },
    {
      title: 'Project report and PPT support',
      body: "The write-up is part of the delivery, not an afterthought: problem statement, literature survey pointers, system design, module descriptions, testing notes and results. Send your college's report template or your guide's guidelines and we work inside that structure instead of handing you something you then have to reformat."
    },
    {
      title: 'A viva walkthrough before you submit',
      body: 'We take you through the architecture and each module, and through the questions examiners actually ask — why this algorithm, why this database, what happens when the input is empty or the network drops. The point is that you can answer in your own words rather than recite.'
    },
    {
      title: 'Code you can genuinely explain',
      body: 'We keep the implementation as simple as the problem allows and comment the parts that are not obvious. A project you cannot explain is a project you cannot defend, so readability is treated as a deliverable rather than a nicety.'
    }
  ];

  /** Project shapes we build, used as the chip row under the branch copy. */
  readonly projectShapes = [
    'Full-stack web apps',
    'REST APIs',
    'Admin dashboards',
    'Machine learning models',
    'Computer vision',
    'NLP & text analysis',
    'IoT with a web backend',
    'Recommendation systems',
    'Database-driven systems'
  ];

  readonly process = [
    {
      title: 'Send the form above',
      body: 'The more you give us — branch, submission date, what your guide has already fixed, the synopsis if you have one — the more exact our answer can be.'
    },
    {
      title: 'We reply with a plan',
      body: 'What we would build, the modules it breaks into, what you will do yourself, and what it costs. Nothing is charged for this and you are not committed to anything.'
    },
    {
      title: 'We agree the scope in writing',
      body: 'If part of your idea is not realistic for the deadline, you hear it here — not a week before submission. Cutting scope early is cheap; discovering it late is not.'
    },
    {
      title: 'We build in stages and show you each one',
      body: 'You see working modules as they are finished instead of one zip file at the end, which is also the point at which a change your guide asks for is easy to make.'
    },
    {
      title: 'Report, PPT and walkthrough',
      body: 'The documentation is prepared alongside the code, and we take you through the whole project before you submit it.'
    }
  ];

  /**
   * Visible FAQ and the page's `FAQPage` structured data come from this one
   * array, so the two can never say different things. Deliberately no prices
   * and no delivery-time promises — both depend on scope the owner quotes
   * individually.
   */
  readonly faqs: FaqItem[] = [
    {
      question: 'Will I get the complete source code?',
      answer:
        'Yes. You get the entire codebase, the database schema and the setup instructions — not a recorded demo and not a partial build. We also walk you through running it on your own machine, so there is nothing to discover for the first time in the lab.'
    },
    {
      question: 'Do you help with the project report and PPT?',
      answer:
        "Yes, and they are part of the delivery rather than an add-on. Send us your college's report format or your guide's guidelines and we write inside that structure: problem statement, system design, module descriptions, testing and results. If your department has a fixed template, we use it."
    },
    {
      question: 'How long does a final year project take?',
      answer:
        'It depends entirely on scope — a mini project and a full major project with a trained model behind it are very different amounts of work. Put your submission date on the form and we will tell you honestly whether it is realistic and what we would cut to make it fit, rather than agreeing to a date and then missing it.'
    },
    {
      question: 'Can you help me prepare for my viva?',
      answer:
        'Yes. Before you submit we take you through the architecture, each module, and the questions examiners usually probe: why this algorithm, why this database, what happens at the edges. The code is commented for the same reason — you should be able to explain any part of it without reading from a script.'
    },
    {
      question: 'Which branches and project types do you take on?',
      answer:
        'Anything where the deliverable is software: full-stack web applications, REST APIs, dashboards, machine learning and computer vision models, NLP, recommendation systems, and IoT projects with a web backend. That covers most CSE, IT, ISE, AI/ML, data science, MCA, BCA and MSc requirements, plus the software side of ECE and EEE projects. If a project needs hardware fabrication, we will tell you rather than take it on.'
    },
    {
      question: 'Can you build a project based on a specific IEEE paper?',
      answer:
        'Yes, and it is one of the most common requests we get. Attach the paper to your enquiry. We will read it and tell you which parts can realistically be reproduced in the time you have, which parts depend on a dataset or hardware you may not have access to, and what a defensible implementation of it would look like.'
    },
    {
      question: 'How much does it cost?',
      answer:
        'There is no fixed price list, because the work ranges from a small mini project to a full major project. The price depends on the scope, the stack and how close your deadline is, and you get a number in writing before anything starts. Send the form above or message us on WhatsApp and the plan comes back with the cost attached.'
    },
    {
      question: 'What if my guide asks for changes halfway through?',
      answer:
        'That is normal and we plan for it. Because the project is built and shown to you in stages rather than delivered as one zip file at the end, a change asked for in review is usually a change to one module. Tell us what was said and we will tell you what it affects before touching anything.'
    }
  ];

  /** Today, as yyyy-mm-dd, for the date input's `min` attribute. */
  readonly minDate = new Date().toISOString().split('T')[0];

  constructor() {
    this.projectForm = this.fb.group({
      name: [
        '',
        [Validators.required, Validators.minLength(3), Validators.maxLength(100)]
      ],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
      college: [
        '',
        [Validators.required, Validators.minLength(3), Validators.maxLength(150)]
      ],
      branch: ['', Validators.required],
      projectType: ['', Validators.required],
      expectedSubmissionDate: ['', Validators.required],
      urgency: ['', Validators.required],
      description: [
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
    this.seo.update({
      title: 'Final Year Project Help & Source Code',
      description:
        'BE, B.Tech, BCA and MCA final year project help — mini, major and IEEE projects with complete source code, project report, PPT and viva preparation help.',
      path: '/student-projects',
      keywords:
        'final year project with source code, final year project help, BE final year project, B.Tech final year project, BCA MCA final year project, IEEE project, mini project, major project, project report and PPT, CSE IT project, academic project development, engineering project help online'
    });

    this.structuredData.apply([
      this.structuredData.breadcrumbs([
        { name: 'Home', path: '/' },
        { name: 'Services', path: '/services' },
        { name: 'Final year project help', path: '/student-projects' }
      ]),
      this.structuredData.service(ACADEMIC_PROJECT_SERVICE),
      this.structuredData.faqPage('/student-projects', this.faqs)
    ]);
  }

  // -------------------------------------------------------------- validation
  isInvalid(controlName: string): boolean {
    return showError(this.projectForm, controlName);
  }

  getError(controlName: string): string {
    return errorFor(this.projectForm, controlName);
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
    const control = this.projectForm.get(controlName);
    const value = control?.value;
    if (typeof value !== 'string') {
      return;
    }
    const trimmed = value.trim();
    if (trimmed !== value) {
      control?.setValue(trimmed);
    }
  }

  get descriptionLength(): number {
    return (
      (this.projectForm.get('description')?.value as string | null)?.length ?? 0
    );
  }

  // ------------------------------------------------------------------ files
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fileError.set('');

    if (!input.files?.length) {
      return;
    }

    const incoming = Array.from(input.files);

    if (incoming.length > MAX_FILES) {
      this.fileError.set(`Please attach at most ${MAX_FILES} files.`);
      this.selectedFiles.set([]);
      input.value = '';
      return;
    }

    for (const file of incoming) {
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        this.fileError.set(
          `"${file.name}" isn't a supported file type. Use PDF, DOC, DOCX, PPT, PPTX or ZIP.`
        );
        this.selectedFiles.set([]);
        input.value = '';
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        this.fileError.set(
          `"${file.name}" is ${this.formatSize(file.size)} — the limit is 10 MB per file.`
        );
        this.selectedFiles.set([]);
        input.value = '';
        return;
      }
    }

    this.selectedFiles.set(incoming);
  }

  removeFile(index: number): void {
    this.selectedFiles.update((files) => files.filter((_, i) => i !== index));
    this.fileError.set('');
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ----------------------------------------------------------------- submit
  submit(): void {
    this.submitError.set('');
    this.submitSuccess.set('');

    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      this.focusFirstError();
      return;
    }

    if (this.fileError()) {
      return;
    }

    this.isSubmitting.set(true);

    const files = this.selectedFiles();
    const request$ = files.length
      ? forkJoin(files.map((file) => this.uploadService.upload(file))).pipe(
          switchMap((uploads) =>
            this.leadService.createLead(
              this.buildPayload(uploads.map((u) => u.file_url))
            )
          )
        )
      : this.leadService.createLead(this.buildPayload([]));

    request$
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.submitSuccess.set(
            "Got it. We'll review your requirement and reply within 24 hours with what we'd build, how long it takes and what it costs."
          );
          this.projectForm.reset();
          this.selectedFiles.set([]);
          this.scrollToFeedback();
        },
        error: (error: unknown) => {
          this.submitError.set(this.messageFor(error, files.length > 0));
          this.scrollToFeedback();
        }
      });
  }

  // -------------------------------------------------------------- internals
  /** Distinguishes an upload failure from a submission failure. */
  private messageFor(error: unknown, hadFiles: boolean): string {
    if (
      hadFiles &&
      isAppError(error) &&
      error.url?.includes('/upload')
    ) {
      return error.kind === 'payloadTooLarge'
        ? 'One of your attachments was rejected as too large. Remove it and try again — or send the form without attachments and email the file separately.'
        : "We couldn't upload your attachments. Check the file types and sizes, or submit without them and send the files later.";
    }

    return errorMessage(error, {
      validation:
        'Some details were rejected. Check your phone number, email and submission date, then try again.',
      rateLimit:
        'That is a lot of requests in a short time. Please wait a minute and submit again.',
      network:
        "We couldn't reach the server. Check your connection — or message us on WhatsApp instead."
    });
  }

  private buildPayload(attachments: string[]): LeadRequest {
    const value = this.projectForm.getRawValue();
    const typeLabel =
      PROJECT_TYPE_OPTIONS.find((o) => o.value === value.projectType)?.label ??
      value.projectType;

    return {
      lead_type: LEAD_TYPE.StudentProject,
      name: value.name.trim(),
      email: value.email.trim(),
      phone: value.phone.trim(),
      college_name: value.college.trim(),
      branch: value.branch,
      project_title: typeLabel,
      submission_date: value.expectedSubmissionDate,
      urgency: value.urgency,
      description: value.description.trim(),
      attachments
    };
  }

  private focusFirstError(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const first = firstInvalidControl(this.projectForm);
    if (!first) {
      return;
    }
    const el = document.getElementById(`sp-${first}`);
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  private scrollToFeedback(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    setTimeout(() =>
      document
        .querySelector('.sp__feedback')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    );
  }
}
