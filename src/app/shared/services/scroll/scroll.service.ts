import { Injectable, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ScrollService implements OnDestroy {
  private clickListener?: (event: Event) => void;
  private routerSub?: Subscription;

  constructor(private router: Router) {}

  initMobileScrollOnAction(): void {
    if (typeof window === 'undefined' || this.clickListener) return;

    this.clickListener = (event: Event) => {
      if (!this.isMobileViewport()) return;

      const target = event.target as HTMLElement | null;
      if (!target) return;

      const action = target.closest(
        'button, a[routerlink], a[href], [role="button"]',
      );
      if (
        !action ||
        (action instanceof HTMLButtonElement && action.disabled)
      ) {
        return;
      }

      if (action.getAttribute('aria-disabled') === 'true') return;

      requestAnimationFrame(() => this.scrollToTop());
    };

    document.addEventListener('click', this.clickListener, true);

    this.routerSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.isMobileViewport()) {
          this.scrollToTop();
        }
      });
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  isMobileViewport(): boolean {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  ngOnDestroy(): void {
    if (this.clickListener) {
      document.removeEventListener('click', this.clickListener, true);
    }
    this.routerSub?.unsubscribe();
  }
}
