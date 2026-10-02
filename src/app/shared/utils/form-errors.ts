import { AbstractControl, FormGroup } from '@angular/forms';

/**
 * Single source of validation copy.
 *
 * All three lead-capture forms used to carry a near-identical `getError()`
 * method that drifted slightly between them. They now share this.
 */
const FIELD_LABELS: Record<string, string> = {
  name: 'Full name',
  email: 'Email',
  phone: 'Phone number',
  company: 'Company',
  message: 'Message',
  description: 'Project details',
  college: 'College name',
  branch: 'Branch',
  projectType: 'Project type',
  expectedSubmissionDate: 'Submission date',
  urgency: 'Timeline',
  password: 'Password'
};

export function fieldLabel(controlName: string): string {
  return FIELD_LABELS[controlName] ?? 'This field';
}

/** True once the control is both invalid and the user has interacted with it. */
export function showError(
  form: FormGroup,
  controlName: string
): boolean {
  const control = form.get(controlName);
  return !!control && control.invalid && (control.touched || control.dirty);
}

export function errorFor(form: FormGroup, controlName: string): string {
  const control = form.get(controlName);
  if (!control?.errors || !(control.touched || control.dirty)) {
    return '';
  }
  return messageForControl(control, controlName);
}

function messageForControl(
  control: AbstractControl,
  controlName: string
): string {
  const errors = control.errors;
  if (!errors) {
    return '';
  }

  const label = fieldLabel(controlName);

  if (errors['required']) {
    return `${label} is required.`;
  }
  if (errors['email']) {
    return 'Enter a valid email address, e.g. name@example.com.';
  }
  if (errors['minlength']) {
    const { requiredLength, actualLength } = errors['minlength'];
    return `${label} needs at least ${requiredLength} characters (currently ${actualLength}).`;
  }
  if (errors['maxlength']) {
    return `${label} must be ${errors['maxlength'].requiredLength} characters or fewer.`;
  }
  if (errors['pattern']) {
    return controlName === 'phone'
      ? 'Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9.'
      : `${label} is not in the expected format.`;
  }
  if (errors['pastDate']) {
    return 'Choose a date in the future.';
  }

  return `${label} is not valid.`;
}

/** Name of the first invalid control, for focus management. */
export function firstInvalidControl(form: FormGroup): string | null {
  return (
    Object.keys(form.controls).find((key) => form.get(key)?.invalid) ?? null
  );
}
