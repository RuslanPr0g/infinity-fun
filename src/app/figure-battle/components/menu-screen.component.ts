import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ENEMY_HEX, PLAYER_HEX } from '../engine/figures';
import { UNIT_ORDER } from '../engine/unit-data';
import { FigureBattleGameService } from '../services/figure-battle-game.service';
import { FigureIconComponent } from './figure-icon.component';

@Component({
  selector: 'fb-menu',
  standalone: true,
  imports: [FigureIconComponent, RouterLink],
  template: `
    <div class="fb-screen">
      <div class="fb-dim" style="--a: 0.62"></div>
      <div class="fb-center">
        <div class="menu">
          <div class="icons">
            @for (k of order; track k; let i = $index) {
              <fb-icon [kind]="k" [color]="i % 2 ? enemy : player" [radius]="13" [spin]="i % 2 ? -0.5 : 0.5" />
            }
          </div>
          <h1>TOTAL FIGURE</h1>
          <div class="sub">B A T T L E &nbsp; S I M U L A T O R</div>
          <p class="fb-muted tag">Command the shapes. Break the formation. Win with tactics.</p>
          <div class="buttons">
            <button class="fb-btn primary" (click)="game.showLevels()">Campaign</button>
            <button class="fb-btn" (click)="game.showArmory('menu')">Armory</button>
            <button class="fb-btn" (click)="game.enterSandbox()">Sandbox</button>
            <a class="fb-btn ghost" routerLink="/">Exit to Infinity Fun</a>
          </div>
          <div class="fb-gold money">$ {{ game.money() }}</div>
          <div class="extras">
            <button class="fb-btn ghost small" (click)="game.toggleMute()">Sound: {{ game.muted() ? 'Off' : 'On' }}</button>
            @if (canFullscreen) {
              <button class="fb-btn ghost small" (click)="toggleFullscreen()">Fullscreen</button>
            }
          </div>
        </div>
      </div>
      <div class="foot fb-muted">
        <span class="desk">LMB place · RMB remove · 1–7 pick unit · Q/W/E brush · X erase · Space start · M mute</span>
        <span class="touch">Tap or drag to place troops · use Erase to remove · turn sideways for a wider field</span>
      </div>
    </div>
  `,
  styleUrl: './menu-screen.component.scss',
})
export class MenuScreenComponent {
  readonly game = inject(FigureBattleGameService);
  readonly order = UNIT_ORDER;
  readonly player = PLAYER_HEX;
  readonly enemy = ENEMY_HEX;
  readonly canFullscreen = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;

  toggleFullscreen(): void {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    }
  }
}
