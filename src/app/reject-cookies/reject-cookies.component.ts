import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RejectCookiesWebSiteComponent } from './reject-cookies-website/reject-cookies-website.component';
import { CookieConsentService } from './cookie-consent/cookie-consent.service';
import { CookieConsentModalComponent } from './cookie-consent/cookie-consent-modal/cookie-consent-modal.component';

@Component({
  selector: 'app-reject-cookies',
  standalone: true,
  imports: [CommonModule, RejectCookiesWebSiteComponent, CookieConsentModalComponent],
  templateUrl: './reject-cookies.component.html',
  styleUrl: './reject-cookies.component.scss',
})
export class RejectCookiesGameComponent {
  showConsentModal = false;
  gameResult: 'win' | 'lose' | null = null;

  constructor(private consentService: CookieConsentService) { }

  ngOnInit() {
    if (!this.consentService.hasConsented) {
      this.showConsentModal = true;
    }

    this.consentService.changedPreference$.subscribe((consent) => {
      this.gameResult = consent ? 'lose' : 'win';
      setTimeout(() => this.gameResult = null, 4000);
    });
  }
}
