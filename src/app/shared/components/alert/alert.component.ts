import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';

export type AlertTone = 'error' | 'success' | 'warning' | 'info';

/**
 * Inline status message used for every form and data-loading state across the
 * public site and the admin panel.
 *
 * Deliberately inline (not a floating toast) so the message stays next to the
 * control it relates to and screen readers announce it in place.
 */
@Component({
  selector: 'app-alert',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './alert.component.html',
  styleUrl: './alert.component.scss'
})
export class AlertComponent {
  @Input({ required: true }) tone: AlertTone = 'info';
  @Input() message = '';
  @Input() title = '';
  /** Optional retry affordance — shown only when a handler is wired up. */
  @Input() retryLabel = '';

  @Output() retry = new EventEmitter<void>();

  /** Errors interrupt; everything else is announced politely. */
  get liveRole(): 'alert' | 'status' {
    return this.tone === 'error' ? 'alert' : 'status';
  }

  get ariaLive(): 'assertive' | 'polite' {
    return this.tone === 'error' ? 'assertive' : 'polite';
  }
}
