import { Component, signal } from '@angular/core';
import { DrillModeSelectComponent, PlayConfig } from './components/drill-mode-select/drill-mode-select.component';
import { OpeningPickerComponent } from './components/opening-picker/opening-picker.component';
import { OpeningPlayComponent } from './components/opening-play/opening-play.component';
import { OpeningQuizBoardComponent } from './components/opening-quiz-board/opening-quiz-board.component';
import { Opening } from './models/opening.model';
import { GameShellComponent } from '../shared/ui';

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
    GameShellComponent,
    OpeningPickerComponent,
    DrillModeSelectComponent,
    OpeningPlayComponent,
    OpeningQuizBoardComponent,
  ],
  template: `
    <app-game-shell [help]="help" maxWidth="720px">
      @switch (screen()) {
        @case ('picker') {
          <app-opening-picker (start)="onPracticeSetChosen($event)" />
        }
        @case ('mode-select') {
          <app-drill-mode-select [practiceCount]="practiceSet().length" (playChosen)="onPlayChosen($event)"
            (quizChosen)="onQuizChosen()" (back)="screen.set('picker')" />
        }
        @case ('play') {
          <app-opening-play [openings]="practiceSet()" [playConfig]="playConfig()!" (exit)="screen.set('mode-select')" />
        }
        @case ('quiz') {
          <app-opening-quiz-board [openings]="practiceSet()" (exit)="screen.set('mode-select')" />
        }
      }
    </app-game-shell>
  `,
  styleUrl: './chess-openings-game.component.scss',
})
export class ChessOpeningsGameComponent {
  readonly help = [
    'Pick the chess openings you want to learn.',
    'Play it: make the moves of the opening on the board against a bot.',
    'Name it: see the moves and find the opening’s name.',
    'Tap “Preview” next to an opening to see where it leads.',
  ];
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
