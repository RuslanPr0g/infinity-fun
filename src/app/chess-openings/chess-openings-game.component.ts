import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { DrillModeSelectComponent, PlayConfig } from './components/drill-mode-select/drill-mode-select.component';
import { OpeningPickerComponent } from './components/opening-picker/opening-picker.component';
import { OpeningPlayComponent } from './components/opening-play/opening-play.component';
import { OpeningQuizBoardComponent } from './components/opening-quiz-board/opening-quiz-board.component';
import { Opening } from './models/opening.model';

type Screen = 'picker' | 'mode-select' | 'play' | 'quiz';

/**
 * Root Opening Trainer component. Screen transitions (picker → mode-select
 * → play/quiz) are internal state driven by signals, mirroring the
 * math-quiz/chess pattern.
 */
@Component({
  selector: 'app-chess-openings-game',
  standalone: true,
  imports: [
    CommonModule,
    OpeningPickerComponent,
    DrillModeSelectComponent,
    OpeningPlayComponent,
    OpeningQuizBoardComponent,
  ],
  template: `
    <div class="chess-openings-container">
      @switch (screen()) {
        @case ('picker') {
          <app-opening-picker (start)="onPracticeSetChosen($event)" />
        }
        @case ('mode-select') {
          <app-drill-mode-select
            [practiceCount]="practiceSet().length"
            (playChosen)="onPlayChosen($event)"
            (quizChosen)="onQuizChosen()"
            (back)="screen.set('picker')"
          />
        }
        @case ('play') {
          <app-opening-play
            [openings]="practiceSet()"
            [playConfig]="playConfig()!"
            (exit)="screen.set('mode-select')"
          />
        }
        @case ('quiz') {
          <app-opening-quiz-board [openings]="practiceSet()" (exit)="screen.set('mode-select')" />
        }
      }
    </div>
  `,
  styleUrl: './chess-openings-game.component.scss',
})
export class ChessOpeningsGameComponent {
  readonly screen = signal<Screen>('picker');
  readonly practiceSet = signal<Opening[]>([]);
  readonly playConfig = signal<PlayConfig | null>(null);

  onPracticeSetChosen(openings: Opening[]): void {
    this.practiceSet.set(openings);
    this.screen.set('mode-select');
  }

  onPlayChosen(config: PlayConfig): void {
    this.playConfig.set(config);
    this.screen.set('play');
  }

  onQuizChosen(): void {
    this.screen.set('quiz');
  }
}
