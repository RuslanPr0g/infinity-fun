import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, signal } from '@angular/core';
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

  showPreferences = false;

  absurdOptions = [
    'Yes, inject uranium directly into my bloodstream',
    'Quantum Cookie Enhancement™',
    'AI-Powered Balls Analytics',
    'Essential Geolocation Processing',
    'Behavioral Biscuit Tracking',
    'GDPR Compliance Obfuscator',
    'Horse of Wisdom Verification',
    'Sponsored Raisin Injection',
  ];
  selectedOptions = new Set(this.absurdOptions);

  constructor(private consentService: CookieConsentService) { }

  acceptAll() {
    this.consentService.accept();
    this.closed.emit();
  }

  acceptEssential() {
    this.selectedOptions.clear();
    this.selectedOptions.add('Essential Snickerdoodle Processing');
    this.consentService.accept();
    this.closed.emit();
  }

  toggleCustomize() {
    this.showPreferences = true;
  }

  toggleOption(option: string) {
    if (this.selectedOptions.has(option)) {
      this.selectedOptions.delete(option);
    } else {
      this.selectedOptions.add(option);
    }
    this.trollBehavior();
  }

  private trollBehavior() {
    const unselected = this.absurdOptions.filter(opt => !this.selectedOptions.has(opt));
    if (unselected.length === 2) {
      // Randomly select one of the unselected again
      const toReselect = unselected[Math.floor(Math.random() * unselected.length)];
      this.selectedOptions.add(toReselect);
    }
  }

  confirmPreferences() {
    if (this.selectedOptions.size === 0) {
      this.consentService.reject();
    } else {
      this.consentService.accept();
    }
    this.closed.emit();
  }
}
