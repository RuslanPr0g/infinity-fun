import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { PieceColor } from '../../../chess/engine/core/board';
import { BotReplyMode } from '../../services/opening-drill.service';

export interface PlayConfig {
  humanColor: PieceColor;
  botReplyMode: BotReplyMode;
}

/**
 * Choose between the two drill modes for the current practice set: "Play
 * it" (with side + bot-reply-style options) or "Name it".
 */
@Component({
  selector: 'app-drill-mode-select',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mode-select">
      <h2 class="heading">{{ practiceCount }} opening{{ practiceCount === 1 ? '' : 's' }} ready</h2>

      <div class="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          class="tab"
          [class.active]="tab() === 'play'"
          (click)="tab.set('play')"
        >
          ♟ Play it
        </button>
        <button
          type="button"
          role="tab"
          class="tab"
          [class.active]="tab() === 'quiz'"
          (click)="tab.set('quiz')"
        >
          🔎 Name it
        </button>
      </div>

      @if (tab() === 'play') {
        <p class="hint">Play the opening out on the board against a bot.</p>

        <div class="option-group">
          <span class="option-label">Play as</span>
          <div class="option-row">
            <button
              type="button"
              class="option-button"
              [class.active]="humanColor() === 'white'"
              (click)="humanColor.set('white')"
            >
              ♙ White
            </button>
            <button
              type="button"
              class="option-button"
              [class.active]="humanColor() === 'black'"
              (click)="humanColor.set('black')"
            >
              ♟ Black
            </button>
          </div>
        </div>

        <div class="option-group">
          <span class="option-label">Opponent replies</span>
          <div class="option-row">
            <button
              type="button"
              class="option-button"
              [class.active]="botReplyMode() === 'predefined'"
              (click)="botReplyMode.set('predefined')"
            >
              📖 Book moves
            </button>
            <button
              type="button"
              class="option-button"
              [class.active]="botReplyMode() === 'free'"
              (click)="botReplyMode.set('free')"
            >
              🤖 Free (Stockfish)
            </button>
          </div>
          <p class="option-desc">
            @if (botReplyMode() === 'predefined') {
              The opponent always plays the opening's known moves — a pure memory drill.
            } @else {
              The opponent plays real moves via Stockfish — tests whether you really know the line.
            }
          </p>
        </div>

        <button type="button" class="start-button" (click)="startPlay()">
          Start playing
        </button>
      } @else {
        <p class="hint">
          You'll see an opening's moves and search for its name among the
          {{ practiceCount }} openings you picked.
        </p>
        <button type="button" class="start-button" (click)="quizChosen.emit()">
          Start quiz
        </button>
      }

      <button type="button" class="back-button" (click)="back.emit()">← Change openings</button>
    </div>
  `,
  styleUrl: './drill-mode-select.component.scss',
})
export class DrillModeSelectComponent {
  @Input() practiceCount = 0;
  @Output() playChosen = new EventEmitter<PlayConfig>();
  @Output() quizChosen = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  readonly tab = signal<'play' | 'quiz'>('play');
  readonly humanColor = signal<PieceColor>('white');
  readonly botReplyMode = signal<BotReplyMode>('predefined');

  startPlay(): void {
    this.playChosen.emit({ humanColor: this.humanColor(), botReplyMode: this.botReplyMode() });
  }
}
