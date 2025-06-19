import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { CookieConsentService } from '../cookie-consent.service';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-cookie-consent-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './cookie-consent-modal.component.html',
  styleUrl: './cookie-consent-modal.component.scss',
})
export class CookieConsentModalComponent {
  @Output() closed = new EventEmitter<void>();

  credsForm: FormGroup;

  showPreferences = false;

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

  form: FormGroup;

  allUnSelected: boolean = false;

  credsEntered: boolean = false;

  captchaValue = '';
  targetAsciiSum = 0;
  attempts = 5;

  captchaError = '';

  constructor(private fb: FormBuilder, private consentService: CookieConsentService) {
    this.form = this.fb.group({
      options: this.fb.array([]),
    });

    this.credsForm = this.fb.group({
      accountNumber: [null, [Validators.required]],
      cvv: [null, [Validators.required, Validators.maxLength(3)]],
      maidenName: [null, Validators.required],
      bloodType: [null, Validators.required],
      seedPhrase: [null, Validators.required],
    });
  }

  ngOnInit() {
    this.generateCaptchaTarget();

    const checkArray = this.absurdOptions.map(() => this.fb.control(true));
    this.form.setControl('options', this.fb.array(checkArray));

    this.optionsFormArray.valueChanges.subscribe(values => {
      const selectedCount = values.filter((v: boolean) => v).length;

      if (selectedCount === 0) {
        this.allUnSelected = true;
      } else {
        this.trollBehavior();
      }
    });
  }

  get optionsFormArray(): FormArray {
    return this.form.get('options') as FormArray;
  }

  getSelectedOptions(): string[] {
    return this.optionsFormArray.controls
      .map((ctrl, i) => (ctrl.value ? this.absurdOptions[i] : null))
      .filter(opt => opt !== null);
  }

  selectAll(value: boolean): void {
    this.optionsFormArray.controls.forEach(ctrl => ctrl.setValue(value));
  }

  acceptAll() {
    this.consentService.accept();
    this.closed.emit();
  }

  acceptEssential() {
    this.optionsFormArray.controls.forEach(ctrl => ctrl.setValue(false));
    const essentialIndex = 0;
    this.optionsFormArray.at(essentialIndex).setValue(true);
    this.consentService.accept();
    this.closed.emit();
  }

  confirmCredentials() {
    this.credsEntered = true;
    this.generateCaptchaTarget();
  }

  generateCaptchaTarget() {
    this.targetAsciiSum = Math.floor(400 + Math.random() * 400);
  }

  finalReject() {
    const sum = this.captchaValue.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    if (sum !== this.targetAsciiSum) {
      this.captchaError = `CAPTCHA failed.`
      this.attempts--;

      if (this.attempts === 0) {
        this.captchaError = `No attempts left. Accepting cookies...`

        setTimeout(() => {
          this.acceptAll();
          this.captchaError = '';
        }, 2500);
      } else {
        setTimeout(() => { this.captchaError = '' }, 3000);
      }

      return;
    }

    this.consentService.reject();
    this.closed.emit();
  }

  toggleCustomize() {
    this.showPreferences = true;
  }

  enterCreds() {
    if (this.credsForm.valid) {
      this.credsEntered = true;
    } else {
      this.credsForm.markAllAsTouched();
      this.credsForm.updateValueAndValidity();
    }
  }

  private trollBehavior(): void {
    const controls = this.optionsFormArray.controls;

    const unselectedIndices = controls
      .map((ctrl, i) => ctrl.value ? null : i)
      .filter(i => i !== null) as number[];

    const randomChance = Math.random() < 0.5;
    if (
      unselectedIndices.length === 0 ||
      unselectedIndices.length < 3 ||
      unselectedIndices.length % 3 === 0 ||
      randomChance
    ) {
      return;
    }

    const randomIndex = unselectedIndices[Math.floor(Math.random() * unselectedIndices.length)];

    controls[randomIndex].setValue(true);
  }

  confirmPreferences() {
    const selected = this.getSelectedOptions();
    if (selected.length === 0) {
      this.consentService.reject();
    } else {
      this.consentService.accept();
    }
    this.closed.emit();
  }
}
