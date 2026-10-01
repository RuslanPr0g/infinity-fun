import {
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import {
  BOARD_COLS,
  BOARD_ROWS,
  Cell,
  Move,
  Piece,
} from '../../models/klotski.models';
import { KIND_SIZE, KlotskiEngine } from '../../services/klotski-engine.service';

interface DragState {
  piece: Piece;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  cellW: number;
  cellH: number;
  dests: Cell[];
  target: Cell;
  moved: boolean;
}

const DRAG_THRESHOLD_PX = 6;

@Component({
  selector: 'app-klotski-board',
  standalone: true,
  template: `
    <div class="board-frame">
      <div class="board" #board>
        @for (p of pieces; track p.id) {
          <div
            class="piece"
            [attr.data-kind]="p.kind"
            [class.dragging]="drag()?.piece?.id === p.id"
            [class.selected]="selectedId() === p.id"
            [class.hinted]="hint?.pieceId === p.id"
            [style.left.%]="p.col * 25"
            [style.top.%]="p.row * 20"
            [style.width.%]="size(p).w * 25"
            [style.height.%]="size(p).h * 20"
            [style.transform]="transformFor(p)"
            (pointerdown)="onPointerDown($event, p)"
            (pointermove)="onPointerMove($event)"
            (pointerup)="onPointerUp($event)"
            (pointercancel)="drag.set(null)"
          >
            <div class="tile"></div>
          </div>
        }

        @for (d of selectedDests(); track $index) {
          <button
            type="button"
            class="ghost"
            [style.left.%]="d.col * 25"
            [style.top.%]="d.row * 20"
            [style.width.%]="selectedSize().w * 25"
            [style.height.%]="selectedSize().h * 20"
            (click)="emitMove(selectedId()!, d)"
            aria-label="Move here"
          ></button>
        }

        @if (drag()?.moved) {
          <div
            class="ghost target"
            [style.left.%]="drag()!.target.col * 25"
            [style.top.%]="drag()!.target.row * 20"
            [style.width.%]="size(drag()!.piece).w * 25"
            [style.height.%]="size(drag()!.piece).h * 20"
          ></div>
        }

        @if (hint; as h) {
          <div
            class="ghost hint"
            [style.left.%]="h.col * 25"
            [style.top.%]="h.row * 20"
            [style.width.%]="hintSize().w * 25"
            [style.height.%]="hintSize().h * 20"
          ></div>
        }
      </div>
      <div class="exit">EXIT</div>
    </div>
  `,
  styleUrl: './klotski-board.component.scss',
})
export class KlotskiBoardComponent implements OnChanges {
  private readonly engine = inject(KlotskiEngine);

  @Input({ required: true }) pieces: readonly Piece[] = [];
  @Input() hint: Move | null = null;
  @Input() disabled = false;
  @Output() moved = new EventEmitter<Move>();

  @ViewChild('board', { static: true }) private boardRef!: ElementRef<HTMLElement>;

  readonly drag = signal<DragState | null>(null);
  readonly selectedId = signal<number | null>(null);
  readonly selectedDests = signal<Cell[]>([]);

  ngOnChanges(): void {
    this.selectedId.set(null);
    this.selectedDests.set([]);
    this.drag.set(null);
  }

  size(p: Piece): { w: number; h: number } {
    return KIND_SIZE[p.kind];
  }

  selectedSize(): { w: number; h: number } {
    const p = this.pieces.find((q) => q.id === this.selectedId());
    return p ? KIND_SIZE[p.kind] : { w: 1, h: 1 };
  }

  hintSize(): { w: number; h: number } {
    const p = this.pieces.find((q) => q.id === this.hint?.pieceId);
    return p ? KIND_SIZE[p.kind] : { w: 1, h: 1 };
  }

  transformFor(p: Piece): string | null {
    const d = this.drag();
    return d && d.piece.id === p.id ? `translate(${d.dx}px, ${d.dy}px)` : null;
  }

  onPointerDown(ev: PointerEvent, piece: Piece): void {
    if (this.disabled) return;
    ev.preventDefault();
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    const rect = this.boardRef.nativeElement.getBoundingClientRect();
    this.drag.set({
      piece,
      startX: ev.clientX,
      startY: ev.clientY,
      dx: 0,
      dy: 0,
      cellW: rect.width / BOARD_COLS,
      cellH: rect.height / BOARD_ROWS,
      dests: this.engine.destinations(this.pieces, piece.id),
      target: { row: piece.row, col: piece.col },
      moved: false,
    });
  }

  onPointerMove(ev: PointerEvent): void {
    const d = this.drag();
    if (!d) return;
    const rawDx = ev.clientX - d.startX;
    const rawDy = ev.clientY - d.startY;
    const moved = d.moved || Math.hypot(rawDx, rawDy) > DRAG_THRESHOLD_PX;

    const candidates: Cell[] = [{ row: d.piece.row, col: d.piece.col }, ...d.dests];
    const wantRow = d.piece.row + rawDy / d.cellH;
    const wantCol = d.piece.col + rawDx / d.cellW;
    let target = candidates[0];
    let best = Infinity;
    for (const c of candidates) {
      const dist = (c.row - wantRow) ** 2 + (c.col - wantCol) ** 2;
      if (dist < best) {
        best = dist;
        target = c;
      }
    }

    const minCol = Math.min(...candidates.map((c) => c.col));
    const maxCol = Math.max(...candidates.map((c) => c.col));
    const minRow = Math.min(...candidates.map((c) => c.row));
    const maxRow = Math.max(...candidates.map((c) => c.row));
    const dx = clamp(rawDx, (minCol - d.piece.col) * d.cellW, (maxCol - d.piece.col) * d.cellW);
    const dy = clamp(rawDy, (minRow - d.piece.row) * d.cellH, (maxRow - d.piece.row) * d.cellH);

    this.drag.set({ ...d, dx, dy, target, moved });
  }

  onPointerUp(ev: PointerEvent): void {
    const d = this.drag();
    if (!d) return;
    (ev.currentTarget as HTMLElement).releasePointerCapture?.(ev.pointerId);
    this.drag.set(null);

    if (!d.moved) {
      this.toggleSelect(d.piece, d.dests);
      return;
    }
    if (d.target.row !== d.piece.row || d.target.col !== d.piece.col) {
      this.emitMove(d.piece.id, d.target);
    }
  }

  emitMove(pieceId: number, to: Cell): void {
    this.moved.emit({ pieceId, row: to.row, col: to.col });
  }

  private toggleSelect(piece: Piece, dests: Cell[]): void {
    if (this.selectedId() === piece.id) {
      this.selectedId.set(null);
      this.selectedDests.set([]);
    } else {
      this.selectedId.set(piece.id);
      this.selectedDests.set(dests);
    }
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
