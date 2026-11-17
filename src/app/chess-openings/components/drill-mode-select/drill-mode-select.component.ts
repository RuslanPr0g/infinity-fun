import { CommonModule } from '@angular/common';
import { SegmentOption, SegmentedComponent } from '../../../shared/ui';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { BotReplyMode } from '../../services/opening-drill.service';

export interface PlayConfig {
  botReplyMode: BotReplyMode;
}

/**
 * Choose between the two drill modes for the current practice set: "Play
 * it" (with the bot-reply-style option) or "Name it".
 *
 * There is deliberately no side picker: an opening belongs to one side, so
 * the play screen derives it per opening (see openingSide()).
 */
@Component({
  selector: 'app-drill-mode-select',
  standalone: true,
  imports: [CommonModule, SegmentedComponent],
  template: `
    <div class="mode-select">
      <p class="ui-kicker">{{ practiceCount }} {{ practiceCount === 1 ? 'opening' : 'openings' }} picked</p>
      <ui-segmented label="Practice type" [options]="tabs" [value]="tab()" (valueChange)="tab.set($event)" />

      <div class="ui-panel card">
        @if (tab() === 'play') {
          <p>Play the opening on the board against a bot. You play the side the opening belongs to.</p>
          <p class="label">The bot plays</p>
          <ui-segmented label="Bot replies" [options]="replyModes" [value]="botReplyMode()" (valueChange)="botReplyMode.set($event)" />
          <p class="ui-muted small">
            @if (botReplyMode() === 'predefined') {
              The book moves of the opening, every time. Good for learning it by heart.
            } @else {
              Its own moves (Stockfish). Shows whether you know the ideas, not just the moves.
            }
          </p>
          <button type="button" class="ui-btn primary big block" (click)="startPlay()">Start</button>
        } @else {
          <p>You see the moves of an opening. Find its name among the {{ practiceCount }} you picked.</p>
          <button type="button" class="ui-btn primary big block" (click)="quizChosen.emit()">Start</button>
        }
      </div>

      <button type="button" class="ui-btn ghost back" (click)="back.emit()">← Pick other openings</button>
    </div>
  `,
  styleUrl: './drill-mode-select.component.scss',
})
export class DrillModeSelectComponent {
  readonly tabs: SegmentOption<'play' | 'quiz'>[] = [
    { value: 'play', label: 'Play it' },
    { value: 'quiz', label: 'Name it' },
  ];
  readonly replyModes: SegmentOption<'predefined' | 'free'>[] = [
    { value: 'predefined', label: 'Book moves' },
    { value: 'free', label: 'Its own moves' },
  ];
  @Input() practiceCount = 0;
  @Output() playChosen = new EventEmitter<PlayConfig>();
  @Output() quizChosen = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  readonly tab = signal<'play' | 'quiz'>('play');
  readonly botReplyMode = signal<BotReplyMode>('predefined');

  startPlay(): void {
    this.playChosen.emit({ botReplyMode: this.botReplyMode() });
  }
}
