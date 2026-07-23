import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { BOT_DIFFICULTIES, BotDifficulty } from '../../engine/bot';
import { PieceColor } from '../../engine/core/board';
import { ChessModeDescriptor } from '../../models/chess-modes';
import { OpponentKind } from '../../services/chess-session.service';

export interface OpponentChoice {
  opponent: OpponentKind;
  botId?: string;
  humanColor?: PieceColor;
}

/**
 * Opponent-selection screen: two players (hotseat) or a bot. Bot choices
 * render from the typed difficulty registry — future levels appear here
 * automatically. The player picks their color when playing the bot.
 */
@Component({
  selector: 'app-opponent-select',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="opponent-select">
      <h2 class="heading">{{ mode?.name }} — choose your opponent</h2>

      <div class="options">
        <button
          type="button"
          class="option"
          [class.active]="choice() === 'hotseat'"
          (click)="chooseHotseat()"
        >
          <span class="option-name">Two players</span>
          <span class="option-desc">Hotseat on this device with hidden move entry.</span>
        </button>

        @for (bot of bots; track bot.id) {
          <button
            type="button"
            class="option"
            [class.active]="choice() === bot.id"
            (click)="chooseBot(bot)"
          >
            <span class="option-name">vs Bot — {{ bot.name }}</span>
            <span class="option-desc">{{ bot.description }}</span>
          </button>
        }
      </div>

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

      <div class="actions">
        <button type="button" class="back-button" (click)="back.emit()">Back</button>
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

  /** 'hotseat' or a bot difficulty id. */
  readonly choice = signal<string | null>(null);
  readonly humanColor = signal<PieceColor>('white');

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
      this.chosen.emit({ opponent: 'hotseat' });
    } else {
      this.chosen.emit({
        opponent: 'bot',
        botId: choice,
        humanColor: this.humanColor(),
      });
    }
  }
}
