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

  showPreferences = true;//false;

  absurdOptions = [
    'Yes, inject uranium directly into my bloodstream',
    'Absolutely, wire my thoughts to a nuclear reactor',
    'Sure, replace my bones with vibrating tungsten rods',
    'Yes, beam encrypted lava pulses into my spine',
    'Go ahead, calibrate my emotions using plutonium dust',
    'Definitely, sync my heartbeat to the Hadron Collider',
    'Yes, initiate the titanium mandible replacement protocol',
    'Proceed with algorithmic volcano core integration',
    'Affirmative, install a graphite-cooled brain enhancer',
    'Enable full-body cryogenic self-destruction response',
    'Authorize transdimensional fax transmission of my soul',
    'Yes, ignite my memory center with industrial-grade jet fuel',
    'Begin neural interface with sentient microwave ovens',
    'Consent granted for perpetual entropy realignment',
    'Yes, replace all teeth with miniature fusion reactors',
    'Upload my conscience into the municipal sewage grid',
    'Initiate orbital laser mood stabilization sequence',
    'Substitute my blood with caffeinated hydraulic fluid',
    'Install quantum banana peels in my motor cortex',
    'Affix anti-matter dampeners to my self-esteem module',
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
