import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../../core/services/auth.service';
import { SeoService } from '../../../core/services/seo.service';
import { errorMessage } from '../../../core/models/app-error.model';
import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { errorFor, showError } from '../../../shared/utils/form-errors';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ThemeToggleComponent,
    AlertComponent
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  readonly loginForm: FormGroup;
  readonly isSubmitting = signal(false);
  readonly errorMessageText = signal('');

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(128)
        ]
      ]
    });
  }

  ngOnInit(): void {
    this.seo.setNoIndex('Sign in', '/admin/login');
  }

  isInvalid(controlName: string): boolean {
    return showError(this.loginForm, controlName);
  }

  getError(controlName: string): string {
    return errorFor(this.loginForm, controlName);
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
    const control = this.loginForm.get(controlName);
    const value = control?.value;
    if (typeof value !== 'string') {
      return;
    }
    const trimmed = value.trim();
    if (trimmed !== value) {
      control?.setValue(trimmed);
    }
  }

  submit(): void {
    this.errorMessageText.set('');

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    this.authService
      .login(this.loginForm.getRawValue())
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/admin/dashboard']),
        error: (error: unknown) => {
          this.errorMessageText.set(
            errorMessage(error, {
              // Never distinguish "unknown email" from "wrong password".
              unauthorized: 'Incorrect email or password.',
              validation: 'Incorrect email or password.',
              notFound: 'Incorrect email or password.',
              rateLimit:
                'Too many sign-in attempts. Wait a minute before trying again.',
              network:
                'Cannot reach the API. Check that the backend is running and reachable.'
            })
          );
        }
      });
  }
}
