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
  stockfish: { icon: '🤖', badge: 'Stockfish 18', badgeClass: 'badge-engine' },
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
    @if (showLoader()) {
      <app-stockfish-loader (ready)="onLoaderReady()" />
    }

    <div class="opponent-select" [class.hidden]="showLoader()">
      <p class="ui-kicker">{{ mode?.name ?? 'Chess' }} · who do you play?</p>

      <section>
        <span class="label">On this device</span>
        <button type="button" class="option ui-panel" [class.on]="choice() === 'hotseat'" (click)="chooseHotseat()">
          <span class="icon">👥</span>
          <span class="info"><b>Two players</b><small>Take turns on this device. Moves stay hidden.</small></span>
        </button>
      </section>

      <section>
        <span class="label">Against a bot</span>
        <div class="bots">
          @for (bot of bots; track bot.id) {
            <button type="button" class="option ui-panel" [class.on]="choice() === bot.id" (click)="chooseBot(bot)">
              <span class="icon">{{ metaFor(bot.id).icon }}</span>
              <span class="info">
                <b>{{ bot.name }} @if (metaFor(bot.id).badge; as badge) { <span class="badge">{{ badge }}</span> }</b>
                <small>{{ bot.description }}</small>
              </span>
            </button>
          }
        </div>
      </section>

      @if (choice() === 'hotseat' && mode?.id === 'shrinking-royale') {
        <div class="pick">
          <span class="label">Armies start</span>
          <div class="ui-seg">
            <button type="button" class="ui-btn seg" [class.on]="royaleArmyLayout() === 'centered'" (click)="royaleArmyLayout.set('centered')">In the middle (8×8)</button>
            <button type="button" class="ui-btn seg" [class.on]="royaleArmyLayout() === 'expanded'" (click)="royaleArmyLayout.set('expanded')">Spread out (16×16)</button>
          </div>
        </div>
      }

      @if (choice() !== null && choice() !== 'hotseat') {
        <div class="pick">
          <span class="label">You play</span>
          <div class="ui-seg">
            <button type="button" class="ui-btn seg" [class.on]="humanColor() === 'white'" (click)="humanColor.set('white')">♙ White</button>
            <button type="button" class="ui-btn seg" [class.on]="humanColor() === 'black'" (click)="humanColor.set('black')">♟ Black</button>
          </div>
        </div>
      }

      <div class="actions">
        <button type="button" class="ui-btn ghost" (click)="back.emit()">← Back</button>
        <button type="button" class="ui-btn primary big" [disabled]="choice() === null" (click)="confirm()">Start game</button>
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
