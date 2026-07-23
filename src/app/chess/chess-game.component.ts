import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ChessBoardComponent } from './components/board/chess-board.component';
import { CapturedTrayComponent } from './components/captured-tray/captured-tray.component';
import { GameOverOverlayComponent } from './components/game-over/game-over-overlay.component';
import { ChessModeSelectComponent } from './components/mode-select/chess-mode-select.component';
import { MoveLogComponent } from './components/move-log/move-log.component';
import {
  OpponentChoice,
  OpponentSelectComponent,
} from './components/opponent-select/opponent-select.component';
import { ChessPieceComponent } from './components/piece/chess-piece.component';
import { PrivacyOverlayComponent } from './components/privacy-overlay/privacy-overlay.component';
import { RevealLayerComponent } from './components/reveal-layer/reveal-layer.component';
import {
  Board,
  Piece,
  PieceColor,
  PieceType,
  PromotionPiece,
  Square,
  boardSize,
  createInitialBoard,
  makePiece,
  opponentOf,
} from './engine/core/board';
import {
  doomedRingSquares,
  roundsUntilBurn,
  voidSquares as voidSquaresOf,
} from './engine/burn';
import { MoveIntent, PASS_INTENT } from './engine/variant';
import { ChessModeDescriptor } from './models/chess-modes';
import { ChessSessionService } from './services/chess-session.service';
import { ChessSettingsService } from './services/chess-settings.service';

/**
 * Root Unusual Chess component. One route (`/chess`); every screen
 * transition (mode select → opponent select → playing → game over) is an
 * internal state driven by signals, mirroring the math-quiz pattern.
 */
type ScreenState = 'mode-select' | 'opponent-select' | 'playing';

@Component({
  selector: 'app-chess-game',
  standalone: true,
  imports: [
    CommonModule,
    ChessModeSelectComponent,
    OpponentSelectComponent,
    ChessBoardComponent,
    ChessPieceComponent,
    RevealLayerComponent,
    PrivacyOverlayComponent,
    MoveLogComponent,
    CapturedTrayComponent,
    GameOverOverlayComponent,
  ],
  template: `
    <div class="chess-container">
      @switch (screen()) {
        @case ('mode-select') {
          <app-chess-mode-select (play)="onModeChosen($event)" />
        }
        @case ('opponent-select') {
          <app-opponent-select
            [mode]="selectedMode()"
            (chosen)="onOpponentChosen($event)"
            (back)="onBackToModes()"
          />
        }
        @case ('playing') {
          <div class="playing">
            <div class="top-bar">
              <span class="status-text">{{ statusText() }}</span>
              @if (burnCountdownText(); as burnText) {
                <span class="burn-chip">🔥 {{ burnText }}</span>
              }
              <button type="button" class="resign-button" (click)="onResign()">
                Resign
              </button>
            </div>

            <div class="play-layout">
              <app-captured-tray
                class="tray-top"
                [owner]="opponentOfPerspective()"
                [captured]="capturedFor(opponentOfPerspective())"
              />

              <div class="board-wrap">
                <app-chess-board
                  [board]="displayBoard()"
                  [perspective]="perspective()"
                  [selectedSquare]="selectedSquare()"
                  [targetSquares]="targetSquares()"
                  [pendingFrom]="pendingFrom()"
                  [pendingTo]="pendingTo()"
                  [highlightSquares]="lastRoundSquares()"
                  [hiddenSquares]="hiddenSquares()"
                  [voidSquares]="voidSquaresList()"
                  [dangerSquares]="dangerSquaresList()"
                  (squareTapped)="onSquareTapped($event)"
                >
                  @if (revealResolution(); as resolution) {
                    <app-reveal-layer
                      [resolution]="resolution"
                      [perspective]="perspective()"
                      (done)="onRevealDone()"
                    />
                  }
                </app-chess-board>
              </div>

              <app-captured-tray
                class="tray-bottom"
                [owner]="perspective()"
                [captured]="capturedFor(perspective())"
              />

              @if (session.phase() === 'entry') {
                <div class="controls">
                  @if (pendingIsPromotion()) {
                    <div class="promotion-pick">
                      <span class="promo-label">Promote to</span>
                      @for (option of promotionOptions; track option) {
                        <button
                          type="button"
                          class="promo-button"
                          [class.active]="pendingPromotion() === option"
                          (click)="setPromotion(option)"
                        >
                          <app-chess-piece [piece]="promoPreview(option)" />
                        </button>
                      }
                    </div>
                  }
                  <div class="action-row">
                    @if (session.passAllowed()) {
                      <button type="button" class="pass-button" (click)="onPass()">
                        Pass
                      </button>
                    }
                    @if (settings.confirmMoves() || pendingIsPromotion()) {
                      <button
                        type="button"
                        class="confirm-button"
                        [disabled]="pendingIntent() === null"
                        (click)="onConfirm()"
                      >
                        {{ confirmLabel() }}
                      </button>
                    }
                  </div>
                  <label class="confirm-toggle">
                    <input
                      type="checkbox"
                      [checked]="settings.confirmMoves()"
                      (change)="onToggleConfirm($event)"
                    />
                    Ask to confirm moves
                  </label>
                </div>
              }

              <app-move-log [entries]="session.moveLog()" />
            </div>
          </div>

          @if (session.phase() === 'handoff') {
            <app-privacy-overlay nextColor="black" (ready)="onHandoffReady()" />
          }
          @if (session.phase() === 'game-over') {
            <app-game-over-overlay
              [status]="session.status()"
              (rematch)="onRematch()"
              (changeMode)="onChangeMode()"
            />
          }
        }
      }
    </div>
  `,
  styleUrl: './chess-game.component.scss',
})
export class ChessGameComponent implements OnDestroy {
  readonly session = inject(ChessSessionService);
  readonly settings = inject(ChessSettingsService);

  readonly screen = signal<ScreenState>('mode-select');
  readonly selectedMode = signal<ChessModeDescriptor | null>(null);
  private lastChoice: OpponentChoice | null = null;

  readonly selectedSquare = signal<Square | null>(null);
  readonly pendingIntent = signal<MoveIntent | null>(null);
  readonly pendingIsPromotion = signal(false);

  readonly promotionOptions: PromotionPiece[] = [
    'queen',
    'rook',
    'bishop',
    'knight',
  ];

  promoPreview(piece: PromotionPiece): Piece {
    return makePiece(piece, this.session.entryColor(), true);
  }

  readonly perspective = computed<PieceColor>(() => {
    const config = this.session.config();
    if (config?.opponent === 'bot') return config.humanColor ?? 'white';
    return 'white';
  });

  readonly opponentOfPerspective = computed<PieceColor>(() =>
    opponentOf(this.perspective()),
  );

  readonly revealResolution = computed(() =>
    this.session.phase() === 'reveal' ? this.session.lastResolution() : null,
  );

  readonly displayBoard = computed<Board>(() => {
    if (this.session.phase() === 'reveal') {
      const resolution = this.session.lastResolution();
      if (resolution) return resolution.positionBefore.board;
    }
    return this.session.position()?.board ?? createInitialBoard();
  });

  /** Rings burned so far, undefined when the mode has no burning. */
  readonly activeBurnedRings = computed<number | undefined>(() => {
    if (this.session.phase() === 'reveal') {
      return this.session.lastResolution()?.positionBefore.burnedRings;
    }
    return this.session.position()?.burnedRings;
  });

  readonly voidSquaresList = computed<Square[]>(() => {
    const burnedRings = this.activeBurnedRings();
    if (burnedRings === undefined) return [];
    return voidSquaresOf(burnedRings, boardSize(this.displayBoard()));
  });

  readonly dangerSquaresList = computed<Square[]>(() => {
    if (this.session.phase() !== 'entry') return [];
    const position = this.session.position();
    const burnedRings = position?.burnedRings;
    if (!position || burnedRings === undefined) return [];
    const remaining = roundsUntilBurn(position.round, burnedRings);
    if (remaining === null || remaining > 3) return [];
    return doomedRingSquares(burnedRings, boardSize(position.board));
  });

  readonly burnCountdownText = computed<string | null>(() => {
    const position = this.session.position();
    const burnedRings = position?.burnedRings;
    if (!position || burnedRings === undefined) return null;
    const remaining = roundsUntilBurn(position.round, burnedRings);
    if (remaining === null) return null;
    return `ring burns in ${remaining} move${remaining === 1 ? '' : 's'}`;
  });

  readonly targetSquares = computed<Square[]>(() => {
    const from = this.selectedSquare();
    if (from === null || this.session.phase() !== 'entry') return [];
    const targets = new Set<Square>();
    for (const intent of this.session.legalIntentsFrom(from)) {
      if (intent.kind === 'move') targets.add(intent.to);
    }
    return [...targets];
  });

  readonly pendingFrom = computed<Square | null>(() => {
    const intent = this.pendingIntent();
    return intent?.kind === 'move' ? intent.from : null;
  });

  readonly pendingTo = computed<Square | null>(() => {
    const intent = this.pendingIntent();
    return intent?.kind === 'move' ? intent.to : null;
  });

  readonly pendingPromotion = computed<PromotionPiece | null>(() => {
    const intent = this.pendingIntent();
    return intent?.kind === 'move' ? intent.promoteTo ?? null : null;
  });

  readonly hiddenSquares = computed<Square[]>(() => {
    if (this.session.phase() !== 'reveal') return [];
    const resolution = this.session.lastResolution();
    if (!resolution) return [];
    const hidden = new Set<Square>();
    for (const event of resolution.events) {
      switch (event.type) {
        case 'moved':
        case 'whiffed':
          hidden.add(event.from!);
          break;
        case 'captured':
          hidden.add(event.from!);
          hidden.add(event.to!);
          break;
        case 'castled':
        case 'bounced':
          if (event.from !== null) hidden.add(event.from);
          if (event.rookFrom !== null) hidden.add(event.rookFrom);
          break;
        case 'burned':
          if (event.from !== null) hidden.add(event.from);
          break;
      }
    }
    return [...hidden];
  });

  readonly lastRoundSquares = computed<Square[]>(() => {
    if (this.session.phase() !== 'entry') return [];
    const resolution = this.session.lastResolution();
    if (!resolution) return [];
    const squares = new Set<Square>();
    for (const event of resolution.events) {
      if (event.type === 'moved' || event.type === 'captured' || event.type === 'castled') {
        if (event.from !== null) squares.add(event.from);
        if (event.to !== null) squares.add(event.to);
      }
    }
    return [...squares];
  });

  readonly statusText = computed<string>(() => {
    const position = this.session.position();
    const round = position?.round ?? 1;
    const phase = this.session.phase();
    if (phase === 'reveal') {
      const resolution = this.session.lastResolution();
      return `Round ${resolution?.round ?? round} — revealing…`;
    }
    const config = this.session.config();
    if (config?.opponent === 'bot') {
      return `Round ${round} — your move`;
    }
    const color = this.session.entryColor() === 'white' ? 'White' : 'Black';
    return `Round ${round} — ${color}: enter your move`;
  });

  readonly confirmLabel = computed<string>(() => {
    const intent = this.pendingIntent();
    if (intent?.kind === 'pass') return 'Confirm pass';
    return 'Confirm move';
  });

  ngOnDestroy(): void {
    this.session.reset();
  }

  onModeChosen(mode: ChessModeDescriptor): void {
    this.selectedMode.set(mode);
    this.screen.set('opponent-select');
  }

  onBackToModes(): void {
    this.selectedMode.set(null);
    this.screen.set('mode-select');
  }

  onOpponentChosen(choice: OpponentChoice): void {
    const mode = this.selectedMode();
    if (!mode) return;
    this.lastChoice = choice;
    this.session.start({
      modeId: mode.id,
      opponent: choice.opponent,
      botId: choice.botId,
      humanColor: choice.humanColor,
    });
    this.clearEntryState();
    this.screen.set('playing');
  }

  onSquareTapped(sq: Square): void {
    if (this.session.phase() !== 'entry') return;
    const board = this.session.position()?.board;
    if (!board) return;

    const piece = board[sq];
    if (piece && piece.color === this.session.entryColor()) {
      if (this.selectedSquare() === sq) {
        this.clearEntryState();
      } else {
        this.selectedSquare.set(sq);
        this.pendingIntent.set(null);
        this.pendingIsPromotion.set(false);
      }
      return;
    }

    const from = this.selectedSquare();
    if (from !== null && this.targetSquares().includes(sq)) {
      const intents = this.session
        .legalIntentsFrom(from)
        .filter(
          (intent): intent is Extract<MoveIntent, { kind: 'move' }> =>
            intent.kind === 'move' && intent.to === sq,
        );
      const isPromotion = intents.some((intent) => intent.promoteTo !== undefined);
      // Promotions always go through the picker + confirm — a piece must be
      // chosen. Everything else submits instantly when confirmation is off.
      if (!isPromotion && !this.settings.confirmMoves()) {
        this.session.confirmIntent(intents[0]);
        this.clearEntryState();
        return;
      }
      this.pendingIsPromotion.set(isPromotion);
      this.pendingIntent.set(
        isPromotion
          ? { kind: 'move', from, to: sq, promoteTo: 'queen' }
          : intents[0],
      );
      return;
    }

    this.clearEntryState();
  }

  setPromotion(piece: PromotionPiece): void {
    const intent = this.pendingIntent();
    if (intent?.kind !== 'move') return;
    this.pendingIntent.set({ ...intent, promoteTo: piece });
  }

  onPass(): void {
    this.selectedSquare.set(null);
    this.pendingIsPromotion.set(false);
    if (!this.settings.confirmMoves()) {
      this.session.confirmIntent(PASS_INTENT);
      this.clearEntryState();
      return;
    }
    this.pendingIntent.set(PASS_INTENT);
  }

  onConfirm(): void {
    const intent = this.pendingIntent();
    if (!intent) return;
    this.session.confirmIntent(intent);
    this.clearEntryState();
  }

  onToggleConfirm(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.settings.setConfirmMoves(checked);
    if (!checked) {
      // Drop any half-entered pending move so state stays consistent.
      const intent = this.pendingIntent();
      if (intent && !this.pendingIsPromotion()) {
        this.pendingIntent.set(null);
      }
    }
  }

  onHandoffReady(): void {
    this.session.continueHandoff();
  }

  onRevealDone(): void {
    this.session.completeReveal();
  }

  onResign(): void {
    const config = this.session.config();
    if (!config || this.session.phase() === 'game-over') return;
    const resigning =
      config.opponent === 'bot'
        ? config.humanColor ?? 'white'
        : this.session.entryColor();
    const who = resigning === 'white' ? 'White' : 'Black';
    if (window.confirm(`${who} resigns — are you sure?`)) {
      this.session.resign(resigning);
    }
  }

  onRematch(): void {
    const mode = this.selectedMode();
    const choice = this.lastChoice;
    if (!mode || !choice) return;
    this.session.start({
      modeId: mode.id,
      opponent: choice.opponent,
      botId: choice.botId,
      humanColor: choice.humanColor,
    });
    this.clearEntryState();
  }

  onChangeMode(): void {
    this.session.reset();
    this.clearEntryState();
    this.selectedMode.set(null);
    this.screen.set('mode-select');
  }

  capturedFor(color: PieceColor): PieceType[] {
    return color === 'white'
      ? this.session.capturedByWhite()
      : this.session.capturedByBlack();
  }

  private clearEntryState(): void {
    this.selectedSquare.set(null);
    this.pendingIntent.set(null);
    this.pendingIsPromotion.set(false);
  }
}
