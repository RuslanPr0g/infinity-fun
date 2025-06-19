import { Injectable } from '@angular/core';

const COOKIE_CONSENT_KEY = 'cookie_consent';

@Injectable({ providedIn: 'root' })
export class CookieConsentService {
    private _hasConsented: boolean | null = null;

    constructor() {
        const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
        this._hasConsented = stored ? stored === 'true' : null;
    }

    get hasConsented(): boolean | null {
        return this._hasConsented;
    }

    accept(): void {
        this._setConsent(true);
    }

    reject(): void {
        this._setConsent(false);
    }

    private _setConsent(value: boolean): void {
        this._hasConsented = value;
        localStorage.setItem(COOKIE_CONSENT_KEY, value.toString());
    }
}
