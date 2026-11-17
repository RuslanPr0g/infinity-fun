import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { LocalStorageConst } from '../core/constants/local-storage.const';
import { LocalStorageService } from '../shared/services/local-storage/local-storage.service';
import { SoundService } from '../shared/services/sound/sound.service';
import { KlotskiBoardComponent } from './components/board/klotski-board.component';
import { KlotskiGraphViewComponent } from './components/graph-view/klotski-graph-view.component';
import { KlotskiPreviewComponent } from './components/preview/klotski-preview.component';
import {
  EdgeMode,
  Move,
  Piece,
  Preset,
  PresetId,
  StateGraph,
  ViewMode,
} from './models/klotski.models';
import { CLASSIC_KEY, KlotskiEngine } from './services/klotski-engine.service';
import { KlotskiGraphService } from './services/klotski-graph.service';

const PRESETS: Preset[] = [
  { id: 'easy', label: 'Easy', goalDistance: 12 },
  { id: 'medium', label: 'Medium', goalDistance: 35 },
  { id: 'classic', label: 'Classic', goalDistance: null },
];

const EDGE_MODES: EdgeMode[] = ['tree', 'all', 'none'];
const AUTO_SOLVE_STEP_MS = 450;

import { GameShellComponent, StatBarComponent } from '../shared/ui';
@Component({
  selector: 'app-klotski-game',
  standalone: true,
  imports: [GameShellComponent, StatBarComponent, KlotskiBoardComponent, KlotskiGraphViewComponent, KlotskiPreviewComponent],
  template: `
    <app-game-shell [help]="help" maxWidth="1120px">
      <div class="ui-seg presets">
        @for (p of presets; track p.id) {
          <button type="button" class="ui-btn seg" [class.on]="preset() === p.id" [disabled]="!graph() && p.id !== 'classic'" (click)="start(p.id)">{{ p.label }}</button>
        }
      </div>

      <div class="layout">
        <section class="play">
          <app-klotski-board [pieces]="pieces()" [hint]="hint()" [disabled]="solved() || autoSolving()" (moved)="onMove($event)" />

          <ui-stat-bar [stats]="[
            { label: 'Moves', value: moves() },
            { label: 'Fewest left', value: remaining() ?? '…' },
            { label: 'Best', value: best() ?? '–' }
          ]" />

          @if (solved()) {
            <p class="solved">
              Solved in {{ moves() }} moves.
              @if (usedHelp()) { (You had help.) }
              @else if (optimalFromStart() !== null) { The fewest possible is {{ optimalFromStart() }}. }
            </p>
          }

          <div class="actions">
            <button type="button" class="ui-btn" (click)="undo()" [disabled]="!history().length || autoSolving()">Undo</button>
            <button type="button" class="ui-btn" (click)="restart()">Restart</button>
            <button type="button" class="ui-btn" (click)="showHint()" [disabled]="!graph() || solved() || autoSolving()">Hint</button>
            <button type="button" class="ui-btn" [class.primary]="!autoSolving()" (click)="toggleAutoSolve()" [disabled]="!graph() || solved()">{{ autoSolving() ? 'Stop' : 'Solve it' }}</button>
          </div>
        </section>

        <section class="viz">
          <div class="viz-stage">
            <app-klotski-graph-view [graph]="graph()" [layout]="layout()" [trail]="trail()" [current]="current()" [hintNode]="hintNode()"
              [mode]="viewMode()" [follow]="follow()" [edgeMode]="edgeMode()" [selectedNode]="selectedNode()" (nodeTap)="selectedNode.set($event)" />
            @if (preview(); as pv) {
              <app-klotski-preview class="preview-card" [pieces]="pv.pieces" [movesLeft]="pv.movesLeft" [fromStart]="pv.fromStart" [label]="pv.label" (closed)="selectedNode.set(-1)" />
            }
          </div>

          <div class="ui-seg view-controls">
            <button type="button" class="ui-btn seg" [class.on]="viewMode() === '2d'" (click)="viewMode.set('2d')">2D</button>
            <button type="button" class="ui-btn seg" [class.on]="viewMode() === '3d'" (click)="viewMode.set('3d')">3D</button>
            <button type="button" class="ui-btn seg" [class.on]="follow()" (click)="follow.set(!follow())">Follow me</button>
            <button type="button" class="ui-btn seg" (click)="cycleEdges()">Lines: {{ edgeMode() }}</button>
          </div>

          <p class="legend">
            @if (graph(); as g) { <b>{{ g.keys.length.toLocaleString('en-US') }}</b> positions, <b>{{ g.edgeCount.toLocaleString('en-US') }}</b> moves. }
            Each dot is a position. Color shows how close it is to solved (yellow = solved).
            Farther from the middle means more moves from the start.
            @if (viewMode() === '3d') { Height shows moves left. }
            The green line is your path. Tap a dot to see it.
          </p>
        </section>
      </div>
    </app-game-shell>
  `,
  styleUrl: './klotski-game.component.scss',
})
export class KlotskiGameComponent implements OnInit, OnDestroy {
  readonly help = [
    'Slide the blocks to get the big block out through the gap at the bottom.',
    'Drag a block, or tap it to move it.',
    'The picture on the right shows every position the puzzle can be in. Each dot is one position; each move is a line.',
    'Stuck? Hint shows a good next move. Solve it plays the shortest solution for you.',
  ];
  private readonly engine = inject(KlotskiEngine);
  private readonly graphService = inject(KlotskiGraphService);
  private readonly storage = inject(LocalStorageService);
  private readonly sound = inject(SoundService);

  readonly presets = PRESETS;

  readonly graph = signal<StateGraph | null>(null);
  readonly preset = signal<PresetId>('classic');
  readonly startKey = signal(CLASSIC_KEY);
  readonly pieces = signal<Piece[]>(this.engine.boardFromKey(CLASSIC_KEY));
  readonly history = signal<Piece[][]>([]);
  readonly hint = signal<Move | null>(null);
  readonly autoSolving = signal(false);
  readonly usedHelp = signal(false);
  readonly best = signal<number | null>(null);

  readonly selectedNode = signal(-1);

  readonly viewMode = signal<ViewMode>('3d');
  readonly follow = signal(true);
  readonly edgeMode = signal<EdgeMode>('tree');

  readonly moves = computed(() => this.history().length);
  readonly solved = computed(() => this.engine.isSolved(this.pieces()));

  readonly layout = computed(() => {
    const g = this.graph();
    const root = g?.index.get(this.startKey());
    return g && root !== undefined ? this.graphService.layout(g, root) : null;
  });

  readonly trail = computed(() => {
    const g = this.graph();
    if (!g) return [];
    return [...this.history(), this.pieces()]
      .map((b) => g.index.get(this.engine.keyOf(b)))
      .filter((i): i is number => i !== undefined);
  });

  readonly current = computed(() => this.trail().at(-1) ?? -1);

  readonly remaining = computed(() => {
    const g = this.graph();
    const c = this.current();
    return g && c >= 0 ? g.goalDist[c] : null;
  });

  readonly optimalFromStart = computed(() => {
    const g = this.graph();
    const i = g?.index.get(this.startKey());
    return g && i !== undefined ? g.goalDist[i] : null;
  });

  readonly hintNode = computed(() => {
    const g = this.graph();
    const h = this.hint();
    if (!g || !h) return -1;
    const next = this.engine.move(this.pieces(), h.pieceId, h.row, h.col);
    return g.index.get(this.engine.keyOf(next)) ?? -1;
  });

  readonly preview = computed(() => {
    const g = this.graph();
    const l = this.layout();
    const i = this.selectedNode();
    if (!g || !l || i < 0 || i >= g.keys.length) return null;
    let label = '';
    if (i === this.current()) label = 'You are here';
    else if (i === l.root) label = 'Start';
    else if (g.goalDist[i] === 0) label = 'Solved position';
    else if (this.trail().includes(i)) label = 'On your path';
    return {
      pieces: this.engine.boardFromKey(g.keys[i]),
      movesLeft: g.goalDist[i],
      fromStart: l.depth[i],
      label,
    };
  });

  private solveTimer: ReturnType<typeof setInterval> | null = null;
  private buildTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loadBest();
    // Let the board paint first; the crawl takes a few hundred milliseconds.
    this.buildTimer = setTimeout(() => {
      this.graph.set(this.graphService.buildStateSpace(CLASSIC_KEY));
    }, 30);
  }

  ngOnDestroy(): void {
    this.stopAutoSolve();
    if (this.buildTimer) clearTimeout(this.buildTimer);
  }

  start(id: PresetId): void {
    const preset = PRESETS.find((p) => p.id === id)!;
    const g = this.graph();
    let key = CLASSIC_KEY;
    if (preset.goalDistance !== null) {
      if (!g) return;
      key = this.graphService.findAtGoalDistance(g, preset.goalDistance) ?? CLASSIC_KEY;
    }
    this.stopAutoSolve();
    this.preset.set(id);
    this.startKey.set(key);
    this.reset(key);
    this.loadBest();
  }

  restart(): void {
    this.stopAutoSolve();
    this.reset(this.startKey());
  }

  onMove(m: Move): void {
    const before = this.pieces();
    this.history.update((h) => [...h, before]);
    this.pieces.set(this.engine.move(before, m.pieceId, m.row, m.col));
    this.hint.set(null);
    if (this.solved()) this.onSolved();
  }

  undo(): void {
    const h = this.history();
    if (!h.length) return;
    this.pieces.set(h[h.length - 1]);
    this.history.set(h.slice(0, -1));
    this.hint.set(null);
  }

  showHint(): void {
    const g = this.graph();
    if (!g) return;
    this.usedHelp.set(true);
    this.hint.set(this.graphService.bestMove(g, this.pieces()));
  }

  toggleAutoSolve(): void {
    if (this.autoSolving()) {
      this.stopAutoSolve();
      return;
    }
    this.usedHelp.set(true);
    this.autoSolving.set(true);
    this.solveTimer = setInterval(() => this.autoStep(), AUTO_SOLVE_STEP_MS);
  }

  cycleEdges(): void {
    const next = EDGE_MODES[(EDGE_MODES.indexOf(this.edgeMode()) + 1) % EDGE_MODES.length];
    this.edgeMode.set(next);
  }

  private autoStep(): void {
    const g = this.graph();
    const m = g ? this.graphService.bestMove(g, this.pieces()) : null;
    if (!m) {
      this.stopAutoSolve();
      return;
    }
    this.onMove(m);
  }

  private stopAutoSolve(): void {
    if (this.solveTimer) clearInterval(this.solveTimer);
    this.solveTimer = null;
    this.autoSolving.set(false);
  }

  private reset(key: string): void {
    this.selectedNode.set(-1);
    this.pieces.set(this.engine.boardFromKey(key));
    this.history.set([]);
    this.hint.set(null);
    this.usedHelp.set(false);
  }

  private onSolved(): void {
    this.stopAutoSolve();
    this.sound.playCorrect();
    if (this.usedHelp()) return;
    const moves = this.moves();
    const best = this.best();
    if (best === null || moves < best) {
      this.best.set(moves);
      this.storage.setItem<number>(this.bestKey(), moves);
    }
  }

  private loadBest(): void {
    this.best.set(this.storage.getItem<number>(this.bestKey()));
  }

  private bestKey(): string {
    return `${LocalStorageConst.KlotskiBest}-${this.preset()}`;
  }
}
