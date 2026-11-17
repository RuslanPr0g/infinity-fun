import { Component, computed, effect, inject } from '@angular/core';
import { SoundService } from '../shared/services/sound/sound.service';
import { GameShellComponent, UiModalComponent } from '../shared/ui';
import { ConsentComponent } from './parts/consent.component';
import { FakeSiteComponent } from './parts/fake-site.component';
import { RejectCookiesStore } from './reject-cookies.store';

/**
 * Reject All Cookies: a fake website (in a fake browser window) with the most annoying cookie
 * banner we could build. Win by rejecting everything. The site's look is in-world; the frame,
 * results and controls are the normal Infinity Fun UI.
 */
@Component({
  selector: 'app-reject-cookies',
  standalone: true,
  imports: [GameShellComponent, UiModalComponent, FakeSiteComponent, ConsentComponent],
  providers: [RejectCookiesStore],
  template: `
    <app-game-shell layout="fill" [sound]="true" [help]="help">
      <div class="stage">
        <div class="browser">
          <div class="chrome" aria-hidden="true">
            <i></i><i></i><i></i>
            <span class="url">🔒 cryptozoo.example</span>
          </div>
          <div class="page">
            <div class="site" [class.locked]="playing()"><rc-fake-site /></div>
            @if (playing()) {
              <rc-consent />
            }
          </div>
        </div>
      </div>

      @if (!playing()) {
        <ui-modal size="sm" [closable]="false">
          <div class="end">
            @if (store.step() === 'won') {
              <p class="ui-kicker">You did it</p>
              <p class="big">All cookies rejected</p>
              <p class="ui-muted">It took you {{ time() }}. Most sites aren’t quite this bad. Most.</p>
            } @else {
              <p class="ui-kicker ui-danger">Cookies accepted</p>
              <p class="big">They got you</p>
              <p class="ui-muted">The only way to win is to reject every single cookie.</p>
            }
            <button type="button" class="ui-btn primary big block" (click)="again()">Play again</button>
          </div>
        </ui-modal>
      }
    </app-game-shell>
  `,
  styleUrl: './reject-cookies.component.scss',
})
export class RejectCookiesGameComponent {
  readonly store = inject(RejectCookiesStore);
  private readonly sound = inject(SoundService);

  readonly help = [
    'A website wants you to accept its cookies. Your goal: reject them all.',
    'Every “accept” button makes you lose.',
    'Expect the site to fight back. Look for small print and things that move.',
  ];

  readonly playing = computed(() => this.store.step() !== 'won' && this.store.step() !== 'lost');

  constructor() {
    effect(() => {
      const s = this.store.step();
      if (s === 'won') {
        this.sound.playCorrect();
      } else if (s === 'lost') {
        this.sound.playWrong();
      }
    });
  }

  time(): string {
    const s = this.store.seconds();
    return s < 60 ? `${s} seconds` : `${Math.floor(s / 60)} min ${s % 60} s`;
  }

  again(): void {
    this.store.restart();
  }
}
