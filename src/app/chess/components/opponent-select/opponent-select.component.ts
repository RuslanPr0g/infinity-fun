import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';
import { BOT_DIFFICULTIES, BotDifficulty } from '../../engine/bot';
import { PieceColor } from '../../engine/core/board';
import { RoyaleArmyLayout } from '../../engine/variants/shrinking-royale-engine';
import { ChessModeDescriptor } from '../../models/chess-modes';
import { OpponentKind } from '../../services/chess-session.service';
import { StockfishLoaderComponent } from '../stockfish-loader/stockfish-loader.component';

export interface OpponentChoice {
  opponent: OpponentKind;
  botId?: string;
  humanColor?: PieceColor;
  /** Shrinking Royale army layout chosen for a hotseat game. */
  royaleArmyLayout?: RoyaleArmyLayout;
}

/** Icon + badge metadata per difficulty id. */
interface BotMeta {
  icon: string;
  badge?: string;
  badgeClass?: string;
}

const BOT_META: Record<string, BotMeta> = {
  easy:      { icon: '🎯' },
  medium:    { icon: '⚔️' },
  hard:      { icon: '💀' },
  stockfish: { icon: '🤖', badge: '⚡ Stockfish 18', badgeClass: 'badge-engine' },
};

/**
 * Opponent-selection screen — tiered layout:
 *   Section 1 — Hotseat
 *   Section 2 — vs Bot  (2-column grid: Easy / Medium / Hard / Engine)
 *
 * When the Engine bot is selected and Start is clicked, the Stockfish loader
 * appears inline. Once it emits (ready) the game starts. All other opponents
 * start immediately.
 */
@Component({
  selector: 'app-opponent-select',
  standalone: true,
  imports: [CommonModule, StockfishLoaderComponent],
  template: `
    <!-- Stockfish loader overlay, shown inline before the game starts -->
    @if (showLoader()) {
      <app-stockfish-loader (ready)="onLoaderReady()" />
    }

    <div class="opponent-select" [class.hidden]="showLoader()">
      <h2 class="heading">{{ mode?.name ?? 'Chess' }} — choose opponent</h2>

      <!-- ── Section 1: Hotseat ─────────────────────────────────────── -->
      <section class="section">
        <span class="section-label">Local multiplayer</span>
        <button
          type="button"
          class="hotseat-card"
          [class.active]="choice() === 'hotseat'"
          (click)="chooseHotseat()"
        >
          <span class="hotseat-icon">👥</span>
          <span class="hotseat-info">
            <span class="option-name">Two players</span>
            <span class="option-desc">Hotseat on this device with hidden move entry.</span>
          </span>
        </button>
      </section>

      <!-- ── Section 2: vs Bot ──────────────────────────────────────── -->
      <section class="section">
        <span class="section-label">vs Bot</span>
        <div class="bot-grid">
          @for (bot of bots; track bot.id) {
            <button
              type="button"
              class="bot-card"
              [class.active]="choice() === bot.id"
              [class.engine-card]="bot.id === 'stockfish'"
              (click)="chooseBot(bot)"
            >
              <span class="bot-icon">{{ metaFor(bot.id).icon }}</span>
              <span class="bot-info">
                <span class="option-name">
                  {{ bot.name }}
                  @if (metaFor(bot.id).badge; as badge) {
                    <span class="badge" [class]="metaFor(bot.id).badgeClass ?? ''">
                      {{ badge }}
                    </span>
                  }
                </span>
                <span class="option-desc">{{ bot.description }}</span>
              </span>
            </button>
          }
        </div>
      </section>

      <!-- ── Royale army layout (hotseat only) ─────────────────────── -->
      @if (choice() === 'hotseat' && mode?.id === 'shrinking-royale') {
        <div class="color-pick">
          <span class="color-label">Starting army</span>
          <button
            type="button"
            class="color-button"
            [class.active]="royaleArmyLayout() === 'centered'"
            (click)="royaleArmyLayout.set('centered')"
          >
            8×8 centered
          </button>
          <button
            type="button"
            class="color-button"
            [class.active]="royaleArmyLayout() === 'expanded'"
            (click)="royaleArmyLayout.set('expanded')"
          >
            15×15 expanded
          </button>
        </div>
      }

      <!-- ── Color picker (bot games only) ─────────────────────────── -->
      @if (choice() !== null && choice() !== 'hotseat') {
        <div class="color-pick">
          <span class="color-label">Play as</span>
          <button
            type="button"
            class="color-button"
            [class.active]="humanColor() === 'white'"
            (click)="humanColor.set('white')"
          >
            ♙ White
          </button>
          <button
            type="button"
            class="color-button"
            [class.active]="humanColor() === 'black'"
            (click)="humanColor.set('black')"
          >
            ♟ Black
          </button>
        </div>
      }

      <!-- ── Actions ────────────────────────────────────────────────── -->
      <div class="actions">
        <button type="button" class="back-button" (click)="back.emit()">
          ← Back
        </button>
        <button
          type="button"
          class="start-button"
          [disabled]="choice() === null"
          (click)="confirm()"
        >
          Start game
        </button>
      </div>
    </div>
  `,
  styleUrl: './opponent-select.component.scss',
})
export class OpponentSelectComponent {
  @Input() mode: ChessModeDescriptor | null = null;
  @Input() bots: ReadonlyArray<BotDifficulty> = BOT_DIFFICULTIES;
  @Output() chosen = new EventEmitter<OpponentChoice>();
  @Output() back = new EventEmitter<void>();

  /** 'hotseat' | bot difficulty id | null */
  readonly choice = signal<string | null>(null);
  readonly humanColor = signal<PieceColor>('white');
  readonly royaleArmyLayout = signal<RoyaleArmyLayout>('expanded');
  readonly showLoader = signal(false);

  private pendingChoice: OpponentChoice | null = null;

  metaFor(id: string): BotMeta {
    return BOT_META[id] ?? { icon: '🤖' };
  }

  chooseHotseat(): void {
    this.choice.set('hotseat');
  }

  chooseBot(bot: BotDifficulty): void {
    this.choice.set(bot.id);
  }

  confirm(): void {
    const choice = this.choice();
    if (choice === null) return;

    if (choice === 'hotseat') {
      this.chosen.emit({
        opponent: 'hotseat',
        royaleArmyLayout: this.mode?.id === 'shrinking-royale' ? this.royaleArmyLayout() : undefined,
      });
      return;
    }

    const opponentChoice: OpponentChoice = {
      opponent: 'bot',
      botId: choice,
      humanColor: this.humanColor(),
    };

    if (choice === 'stockfish') {
      // Show the loader; emit chosen only after it signals ready.
      this.pendingChoice = opponentChoice;
      this.showLoader.set(true);
      return;
    }

    this.chosen.emit(opponentChoice);
  }

  onLoaderReady(): void {
    this.showLoader.set(false);
    if (this.pendingChoice) {
      this.chosen.emit(this.pendingChoice);
      this.pendingChoice = null;
    }
  }
}
