import { Component, computed, signal } from '@angular/core';
import { GameShellComponent } from '../shared/ui';
import { Grid, SIZE, bestShots, canClick, emptyGrid, heat, tap } from './seabattle.engine';

@Component({
  selector: 'app-seabattle',
  standalone: true,
  imports: [GameShellComponent],
  template: `
    <app-game-shell [help]="help" maxWidth="620px">
      <p class="lead">Mark your shots. The brighter a square, the more likely a ship is there.</p>

      <div class="board" [style.--n]="size">
        <span></span>
        @for (n of cols; track n) { <span class="label">{{ n }}</span> }
        @for (row of grid(); track y; let y = $index) {
          <span class="label">{{ rows[y] }}</span>
          @for (c of row; track x; let x = $index) {
            <button type="button" class="cell {{ c.state }}" [class.best]="best().has(x + ',' + y)"
              [class.locked]="!canClick(grid(), x, y)" [style.--heat]="c.state === 'empty' ? heatOf(x, y) : 0"
              [attr.aria-label]="rows[y] + cols[x] + ', ' + c.state" (click)="onTap(x, y)">
              @if (numbers() && c.state === 'empty' && scores()[y][x] > 0) { <small>{{ scores()[y][x] }}</small> }
            </button>
          }
        }
      </div>

      <ul class="legend">
        <li><i class="cell best sample"></i>Best shot</li>
        <li><i class="cell miss sample"></i>Miss</li>
        <li><i class="cell hit sample"></i>Hit</li>
        <li><i class="cell kill sample"></i>Sunk</li>
      </ul>

      <div class="actions">
        <button type="button" class="ui-btn" [disabled]="!history().length" (click)="undo()">Undo</button>
        <button type="button" class="ui-btn" [disabled]="!history().length" (click)="clear()">Clear board</button>
        <button type="button" class="ui-btn seg" [class.on]="numbers()" [attr.aria-pressed]="numbers()" (click)="numbers.set(!numbers())">Numbers</button>
      </div>
    </app-game-shell>
  `,
  styleUrl: './seabattle-helper.component.scss',
})
export class SeaBattleHelperGameComponent {
  readonly help = [
    'Use this next to a real game of Sea Battle (Battleship) on a 10×10 board.',
    'Tap a square once for a miss, twice for a hit, three times when the ship sinks.',
    'Tap a sunk ship again to undo it.',
    'The fleet is one 4-square ship, two 3s, three 2s and four 1s. Ships never touch, not even at the corners.',
    'While a ship is hit but not sunk, only the squares next to it can be marked.',
  ];
  readonly size = SIZE;
  readonly rows = 'ABCDEFGHIJ'.split('');
  readonly cols = Array.from({ length: SIZE }, (_, i) => i + 1);
  readonly canClick = canClick;

  readonly grid = signal<Grid>(emptyGrid());
  readonly history = signal<Grid[]>([]);
  readonly numbers = signal(false);

  readonly scores = computed(() => heat(this.grid()));
  readonly best = computed(() => bestShots(this.grid(), this.scores()));
  private readonly max = computed(() => Math.max(1, ...this.scores().flat()));

  heatOf(x: number, y: number): number {
    return this.scores()[y][x] / this.max();
  }

  onTap(x: number, y: number): void {
    const next = tap(this.grid(), x, y);
    if (next !== this.grid()) {
      this.history.update((h) => [...h.slice(-99), this.grid()]);
      this.grid.set(next);
    }
  }

  undo(): void {
    const h = this.history();
    if (h.length) {
      this.grid.set(h[h.length - 1]);
      this.history.set(h.slice(0, -1));
    }
  }

  clear(): void {
    this.history.update((h) => [...h, this.grid()]);
    this.grid.set(emptyGrid());
  }
}
