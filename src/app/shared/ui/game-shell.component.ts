import { Component, computed, inject, input, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GameRouteService } from '../services/game-route/game-route.service';
import { SoundService } from '../services/sound/sound.service';
import { textOn } from './color';
import { UiModalComponent } from './ui-modal.component';

/**
 * The frame around every game: full screen, a slim top bar (Back, title, actions) and the play area.
 * Title and accent color come from GameRouteService for the current route, so the color has one home.
 * (The browser tab title is set by GameTitleStrategy on navigation.)
 *
 * - `layout="page"`: padded, centered column that scrolls when needed (quizzes, forms, tools).
 * - `layout="fill"`: the play area gets the whole space with no padding (boards, canvases).
 * - `[help]`: lines for the "How to play" sheet. Adds the ? button.
 * - `sound`: adds a mute button (SoundService).
 * - Extra buttons go in the bar via `<… shellActions>`.
 */
@Component({
  selector: 'app-game-shell',
  standalone: true,
  imports: [RouterLink, UiModalComponent],
  host: {
    '[style.--game-color]': 'color()',
    '[style.--on-accent]': 'onAccent()',
  },
  template: `
    <header class="bar">
      <a class="ui-btn ghost back" routerLink="/" aria-label="Back to all games">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        <span class="back-label">Games</span>
      </a>
      <h1 class="title"><i class="dot"></i><span>{{ name() }}</span></h1>
      <div class="actions">
        <ng-content select="[shellActions]" />
        @if (sound()) {
          <button type="button" class="ui-btn ghost icon" [attr.aria-label]="sounds.muted() ? 'Turn sound on' : 'Turn sound off'"
            [attr.aria-pressed]="!sounds.muted()" (click)="sounds.toggleMute()">
            @if (sounds.muted()) {
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M17 9l4 6M21 9l-4 6" /></svg>
            } @else {
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M17 8.5a5 5 0 010 7M19.5 6a8.5 8.5 0 010 12" /></svg>
            }
          </button>
        }
        @if (help().length) {
          <button type="button" class="ui-btn ghost icon" aria-label="How to play" (click)="helpOpen.set(true)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.3" /><circle cx="12" cy="17" r="0.6" class="fill" /></svg>
          </button>
        }
      </div>
    </header>

    <main class="body" [class.fill]="layout() === 'fill'">
      <div class="inner" [style.max-width]="layout() === 'page' ? maxWidth() : null">
        <ng-content />
      </div>
    </main>

    @if (helpOpen()) {
      <ui-modal heading="How to play" size="sm" (closed)="helpOpen.set(false)">
        <ul class="help">
          @for (line of help(); track $index) {
            <li>{{ line }}</li>
          }
        </ul>
        <button type="button" class="ui-btn primary block" (click)="helpOpen.set(false)">Got it</button>
      </ui-modal>
    }
  `,
  styleUrl: './game-shell.component.scss',
})
export class GameShellComponent {
  private readonly games = inject(GameRouteService);
  private readonly route = inject(ActivatedRoute);
  protected readonly sounds = inject(SoundService);

  /** Overrides the name from GameRouteService. */
  readonly title = input<string>('');
  readonly layout = input<'page' | 'fill'>('page');
  readonly maxWidth = input<string>('760px');
  readonly help = input<string[]>([]);
  readonly sound = input<boolean>(false);

  readonly helpOpen = signal(false);

  private readonly game = this.games.byRoute('/' + (this.route.snapshot.routeConfig?.path ?? ''));
  readonly name = computed(() => this.title() || this.game?.name || 'Infinity Fun');
  readonly color = computed(() => this.game?.color ?? '#3ec5ff');
  readonly onAccent = computed(() => textOn(this.color()));
}
