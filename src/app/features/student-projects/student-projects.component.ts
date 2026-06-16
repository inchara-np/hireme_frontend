import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl
} from '@angular/forms';
import { forkJoin } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

import { LeadService } from '../../core/services/lead.service';
import { UploadService } from '../../core/services/upload.service';
import { LeadRequest } from '../../core/models/lead.model';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.zip'];

@Component({
  selector: 'app-student-projects',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './student-projects.component.html',
  styleUrl: './student-projects.component.scss'
})
export class StudentProjectsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly leadService = inject(LeadService);
  private readonly uploadService = inject(UploadService);

  projectForm: FormGroup;
  selectedFiles: File[] = [];
  fileError = '';
  isSubmitting = false;
  submitError = '';
  submitSuccess = '';

  constructor() {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
      college: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
      branch: ['', Validators.required],
      projectType: ['', Validators.required],
      expectedSubmissionDate: ['', Validators.required],
      urgency: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]]
    });
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fileError = '';

    if (!input.files?.length) {
      return;
    }

    const files = Array.from(input.files);
    if (files.length > MAX_FILES) {
      this.fileError = `You can upload up to ${MAX_FILES} files.`;
      this.selectedFiles = [];
      return;
    }

    for (const file of files) {
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        this.fileError = `Unsupported file type: ${file.name}`;
        this.selectedFiles = [];
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        this.fileError = `${file.name} exceeds 10 MB limit.`;
        this.selectedFiles = [];
        return;
      }
    }

    this.selectedFiles = files;
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.fileError = '';
  }

  isInvalid(controlName: string): boolean {
    const control = this.projectForm.get(controlName);
    return !!(control && control.invalid && control.touched);
  }

  getError(controlName: string): string {
    const control = this.projectForm.get(controlName);
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
      return `Minimum ${control.errors['minlength'].requiredLength} characters required.`;
    }
    if (control.errors['maxlength']) {
      return `Maximum ${control.errors['maxlength'].requiredLength} characters allowed.`;
    }
    if (control.errors['pattern']) {
      return controlName === 'phone'
        ? 'Enter a valid 10-digit Indian mobile number.'
        : 'Invalid format.';
    }

    return 'Invalid value.';
  }

  submit(): void {
    this.submitError = '';
    this.submitSuccess = '';

    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    if (this.fileError) {
      return;
    }

    this.isSubmitting = true;

    const uploadFiles$ = this.selectedFiles.length
      ? forkJoin(this.selectedFiles.map((file) => this.uploadService.upload(file)))
      : undefined;

    const submit$ = uploadFiles$
      ? uploadFiles$.pipe(
          switchMap((uploads) => this.leadService.createLead(this.buildPayload(uploads.map((u) => u.file_url))))
        )
      : this.leadService.createLead(this.buildPayload([]));

    submit$
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {
          this.submitSuccess = 'Request received! We will contact you with a plan and quote soon.';
          this.projectForm.reset();
          this.selectedFiles = [];
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 0) {
            this.submitError = 'Unable to reach the server. Please ensure the backend is running.';
          } else if (err.status === 429) {
            this.submitError = 'Too many requests. Please wait a minute and try again.';
          } else if (this.selectedFiles.length > 0 && err.url?.includes('/upload')) {
            this.submitError = 'File upload failed. Please check file type and size, then try again.';
          } else {
            this.submitError = 'Unable to submit your request. Please check the form and try again.';
          }
        }
      });
  }

  private buildPayload(attachments: string[]): LeadRequest {
    const formValue = this.projectForm.getRawValue();
    return {
      lead_type: 'student_project',
      name: formValue.name.trim(),
      email: formValue.email.trim(),
      phone: formValue.phone.trim(),
      college_name: formValue.college.trim(),
      branch: formValue.branch,
      project_title: `${formValue.projectType} project`,
      submission_date: formValue.expectedSubmissionDate,
      urgency: formValue.urgency,
      description: formValue.description.trim(),
      attachments
    };
  }

  get name(): AbstractControl | null { return this.projectForm.get('name'); }
  get email(): AbstractControl | null { return this.projectForm.get('email'); }
  get phone(): AbstractControl | null { return this.projectForm.get('phone'); }
  get college(): AbstractControl | null { return this.projectForm.get('college'); }
  get branch(): AbstractControl | null { return this.projectForm.get('branch'); }
  get projectType(): AbstractControl | null { return this.projectForm.get('projectType'); }
  get expectedSubmissionDate(): AbstractControl | null { return this.projectForm.get('expectedSubmissionDate'); }
  get urgency(): AbstractControl | null { return this.projectForm.get('urgency'); }
  get description(): AbstractControl | null { return this.projectForm.get('description'); }
}
