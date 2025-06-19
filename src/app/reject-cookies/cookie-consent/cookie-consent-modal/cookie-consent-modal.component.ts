import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { CookieConsentService } from '../cookie-consent.service';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { filter, pairwise, startWith } from 'rxjs';

@Component({
  selector: 'app-cookie-consent-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './cookie-consent-modal.component.html',
  styleUrl: './cookie-consent-modal.component.scss',
})
export class CookieConsentModalComponent {
  @ViewChild('escapeBtn', { static: false }) button!: ElementRef<HTMLButtonElement>;
  @ViewChild('container', { static: false }) container!: ElementRef<HTMLDivElement> | undefined;

  btnPosition = { x: 100, y: 100 };
  escaping = false;
  escapeEndTime = 0;

  startEscape() {
    if (!this.button || this.escaping) return;

    this.escaping = true;
    this.escapeEndTime = Date.now() + 60 * 1000;

    window.addEventListener('mousemove', this.handleMouseMove);

    setTimeout(() => {
      this.escaping = false;
      window.removeEventListener('mousemove', this.handleMouseMove);
    }, 60 * 1000);
  }

  handleMouseMove = (event: MouseEvent) => {
    if (!this.button) return;

    const mouseX = event.clientX;
    const mouseY = event.clientY;

    const btnWidth = this.button.nativeElement.offsetWidth;
    const btnHeight = this.button.nativeElement.offsetHeight;

    const btnCenterX = this.btnPosition.x + btnWidth / 2;
    const btnCenterY = this.btnPosition.y + btnHeight / 2;

    let dx = btnCenterX - mouseX;
    let dy = btnCenterY - mouseY;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;

    const moveAmount = 150;
    let nextX = this.btnPosition.x + (dx / distance) * moveAmount + (Math.random() - 0.5) * 40;
    let nextY = this.btnPosition.y + (dy / distance) * moveAmount + (Math.random() - 0.5) * 40;

    if (nextX < 0 || nextX > window.innerWidth - btnWidth) {
      nextX = this.btnPosition.x + (Math.random() - 0.5) * 100;
    }
    if (nextY < 0 || nextY > window.innerHeight - btnHeight) {
      nextY = this.btnPosition.y + (Math.random() - 0.5) * 100;
    }

    this.btnPosition.x = Math.max(0, Math.min(nextX, window.innerWidth - btnWidth));
    this.btnPosition.y = Math.max(0, Math.min(nextY, window.innerHeight - btnHeight));
  };

  runEscapeLoop() {
    if (Date.now() >= this.escapeEndTime) {
      this.escaping = false;
      return;
    }

    this.randomizePosition();

    setTimeout(() => {
      this.runEscapeLoop();
    }, 300);
  }

  randomizePosition() {
    if (!this.button) return;

    const btnWidth = this.button.nativeElement.offsetWidth;
    const btnHeight = this.button.nativeElement.offsetHeight;

    this.btnPosition.x = Math.random() * (window.innerWidth - btnWidth);
    this.btnPosition.y = Math.random() * (window.innerHeight - btnHeight);
  }

  // OTHER LOGIC

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
      accountNumber: [0, [Validators.required]],
      cvv: [null, [Validators.required, Validators.maxLength(3)]],
      maidenName: [null, Validators.required],
      bloodType: [null, Validators.required],
      seedPhrase: [null, Validators.required],
    });

    this.credsForm.controls['accountNumber'].valueChanges.pipe(
      startWith(0),
      pairwise(),
      filter(([prev, curr]) => {
        const prevNum = Number(prev);
        const currNum = Number(curr);
        return isNaN(prevNum) || isNaN(currNum) || Math.abs(currNum - prevNum) !== 1;
      })
    ).subscribe((v) => {
      const control = this.credsForm.controls['accountNumber'];
      if (control.value !== 0) {
        control.setValue(Math.floor(Math.random() * 9999999999999999), { emitEvent: false });
      }

      if (v[0] === v[1]) {
        control.setValue(Math.floor(Math.random() * 9999999999999999), { emitEvent: false });
      }
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
