import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl
} from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

import { LeadService } from '../../core/services/lead.service';
import { LeadRequest } from '../../core/models/lead.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly leadService = inject(LeadService);
  private readonly route = inject(ActivatedRoute);

  contactForm: FormGroup;
  isSubmitting = false;
  submitError = '';
  submitSuccess = '';
  leadType = 'contact';
  pageTitle = 'Contact Us';
  pageSubtitle = 'Tell us about your project requirements and we will respond within 24 hours.';

  constructor() {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
      company: ['', Validators.maxLength(150)],
      message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]]
    });
  }

  ngOnInit(): void {
    const type = this.route.snapshot.queryParamMap.get('type');
    if (type === 'freelance') {
      this.leadType = 'freelance';
      this.pageTitle = 'Hire Me as a Freelancer';
      this.pageSubtitle = 'Share your project scope, timeline, and budget. I will respond with a plan within 24 hours.';
    } else if (type === 'business') {
      this.leadType = 'business';
      this.pageTitle = 'Start Your Project';
      this.pageSubtitle = 'Tell us about your business requirements and we will build a solution tailored to your goals.';
    }
  }

  submit(): void {
    this.submitError = '';
    this.submitSuccess = '';

    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      this.scrollToFirstError();
      return;
    }

    this.isSubmitting = true;

    const formValue = this.contactForm.getRawValue();
    const payload: LeadRequest = {
      lead_type: this.leadType,
      name: formValue.name.trim(),
      email: formValue.email.trim(),
      phone: formValue.phone.trim(),
      company: formValue.company?.trim() || '',
      description: formValue.message.trim(),
      attachments: []
    };

    this.leadService
      .createLead(payload)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {
          this.submitSuccess = 'Message sent successfully! We will get back to you within 24 hours.';
          this.contactForm.reset();
          this.scrollToMessage();
        },
        error: (err: HttpErrorResponse) => {
          this.submitError = this.getErrorMessage(err);
          this.scrollToMessage();
        }
      });
  }

  isInvalid(controlName: string): boolean {
    const control = this.contactForm.get(controlName);
    return !!(control && control.invalid && control.touched);
  }

  getError(controlName: string): string {
    const control = this.contactForm.get(controlName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    if (control.errors['required']) {
      return 'This field is required.';
    }
    if (control.errors['email']) {
      return 'Enter a valid email address.';
    }
    if (control.errors['minlength']) {
      const min = control.errors['minlength'].requiredLength;
      return `Minimum ${min} characters required.`;
    }
    if (control.errors['maxlength']) {
      const max = control.errors['maxlength'].requiredLength;
      return `Maximum ${max} characters allowed.`;
    }
    if (control.errors['pattern']) {
      if (controlName === 'phone') {
        return 'Enter a valid 10-digit Indian mobile number.';
      }
      return 'Invalid format.';
    }

    return 'Invalid value.';
  }

  private getErrorMessage(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'Unable to reach the server. Please check your connection and try again.';
    }
    if (err.error?.message) {
      return err.error.message === 'invalid request payload'
        ? 'Please check the form fields and try again.'
        : 'Unable to send your message. Please try again.';
    }
    return 'Unable to send your message. Please try again.';
  }

  private scrollToFirstError(): void {
    const firstInvalid = Object.keys(this.contactForm.controls).find(
      (key) => this.contactForm.get(key)?.invalid
    );
    if (firstInvalid) {
      document.getElementById(`contact-${firstInvalid}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }

  private scrollToMessage(): void {
    document.querySelector('.form-feedback')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }

  get name(): AbstractControl | null { return this.contactForm.get('name'); }
  get email(): AbstractControl | null { return this.contactForm.get('email'); }
  get phone(): AbstractControl | null { return this.contactForm.get('phone'); }
  get company(): AbstractControl | null { return this.contactForm.get('company'); }
  get message(): AbstractControl | null { return this.contactForm.get('message'); }
}
