import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { CookieConsentService } from '../cookie-consent.service';

@Component({
  selector: 'app-cookie-consent-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cookie-consent-modal.component.html',
  styleUrl: './cookie-consent-modal.component.scss',
})
export class CookieConsentModalComponent {
  @Output() closed = new EventEmitter<void>();

  constructor(private consentService: CookieConsentService) { }

  accept() {
    this.consentService.accept();
    this.closed.emit();
  }

  reject() {
    this.consentService.reject();
    this.closed.emit();
  }
}