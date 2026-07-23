import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import {
  Piece,
  PieceColor,
  Square,
  boardSize,
  fileOf,
  makePiece,
  opponentOf,
  rankOf,
} from '../../engine/core/board';
import { RoundResolution } from '../../engine/variant';
import { ChessPieceComponent } from '../piece/chess-piece.component';

interface AnimItem {
  kind: 'slide' | 'bounce' | 'victim' | 'miss' | 'burned';
  piece: Piece | null;
  fx: string;
  fy: string;
  tx: string;
  ty: string;
  size: string;
}

/**
 * Absolute overlay on top of the board that replays a round's resolution:
 * slides for moves and castles, out-and-back slides for bounces, a missed
 * ✕ marker for whiffs, and a fade-out for captured pieces. Emits `done`
 * when the animation finishes (or the player taps to skip).
 */
@Component({
  selector: 'app-reveal-layer',
  standalone: true,
  imports: [CommonModule, ChessPieceComponent],
  template: `
    <div class="reveal" (click)="finish()">
      @for (item of items; track $index) {
        @switch (item.kind) {
          @case ('miss') {
            <span
              class="miss"
              [style.left]="item.fx"
              [style.top]="item.fy"
              [style.width]="item.size"
              [style.height]="item.size"
              >✕</span
            >
          }
          @case ('victim') {
            <span
              class="glyph victim"
              [style.left]="item.fx"
              [style.top]="item.fy"
              [style.width]="item.size"
              [style.height]="item.size"
            >
              <app-chess-piece [piece]="item.piece!" />
            </span>
          }
          @case ('burned') {
            <span
              class="glyph burned"
              [style.left]="item.fx"
              [style.top]="item.fy"
              [style.width]="item.size"
              [style.height]="item.size"
            >
              <app-chess-piece [piece]="item.piece!" />
            </span>
          }
          @default {
            <span
              class="glyph"
              [class.slide]="item.kind === 'slide'"
              [class.bounce]="item.kind === 'bounce'"
              [style.width]="item.size"
              [style.height]="item.size"
              [style.--fx]="item.fx"
              [style.--fy]="item.fy"
              [style.--tx]="item.tx"
              [style.--ty]="item.ty"
            >
              <app-chess-piece [piece]="item.piece!" />
            </span>
          }
        }
      }
      @for (chip of passChips; track $index) {
        <span class="pass-chip" [class.black]="chip === 'Black'"
          >{{ chip }} passed</span
        >
      }
    </div>
  `,
  styleUrl: './reveal-layer.component.scss',
})
export class RevealLayerComponent implements OnInit, OnDestroy {
  @Input({ required: true }) resolution!: RoundResolution;
  @Input() perspective: PieceColor = 'white';
  @Input() durationMs = 1700;
  @Output() done = new EventEmitter<void>();

  items: AnimItem[] = [];
  passChips: string[] = [];

  private timer: ReturnType<typeof setTimeout> | null = null;
  private finished = false;

  ngOnInit(): void {
    this.buildItems();
    this.timer = setTimeout(() => this.finish(), this.durationMs);
  }

  ngOnDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  finish(): void {
    if (this.finished) return;
    this.finished = true;
    if (this.timer) clearTimeout(this.timer);
    this.done.emit();
  }

  private get size(): number {
    return boardSize(this.resolution.positionBefore.board);
  }

  private buildItems(): void {
    const items: AnimItem[] = [];
    const chips: string[] = [];

    for (const event of this.resolution.events) {
      const color = event.color;
      switch (event.type) {
        case 'passed':
          chips.push(color === 'white' ? 'White' : 'Black');
          break;
        case 'moved':
          items.push(this.pieceItem('slide', color, event.piece!, event.from!, event.to!));
          break;
        case 'castled':
          items.push(this.pieceItem('slide', color, 'king', event.from!, event.to!));
          items.push(this.pieceItem('slide', color, 'rook', event.rookFrom!, event.rookTo!));
          break;
        case 'bounced':
          if (event.rookFrom !== null) {
            items.push(this.pieceItem('bounce', color, 'king', event.from!, event.to!));
            items.push(this.pieceItem('bounce', color, 'rook', event.rookFrom, event.rookTo!));
          } else {
            items.push(this.pieceItem('bounce', color, event.piece!, event.from!, event.to!));
          }
          break;
        case 'captured':
          items.push(this.pieceItem('slide', color, event.piece!, event.from!, event.to!));
          items.push({
            kind: 'victim',
            piece: makePiece(event.capturedPiece!, opponentOf(color), true),
            fx: this.x(event.to!),
            fy: this.y(event.to!),
            tx: this.x(event.to!),
            ty: this.y(event.to!),
            size: this.pct(),
          });
          break;
        case 'whiffed':
          items.push(
            this.pieceItem(
              event.landed ? 'slide' : 'bounce',
              color,
              event.piece!,
              event.from!,
              event.to!,
            ),
          );
          items.push({
            kind: 'miss',
            piece: null,
            fx: this.x(event.to!),
            fy: this.y(event.to!),
            tx: this.x(event.to!),
            ty: this.y(event.to!),
            size: this.pct(),
          });
          break;
        case 'burned':
          items.push({
            kind: 'burned',
            piece: makePiece(event.piece!, color, true),
            fx: this.x(event.from!),
            fy: this.y(event.from!),
            tx: this.x(event.from!),
            ty: this.y(event.from!),
            size: this.pct(),
          });
          break;
        case 'promoted':
          break; // the final board shows the promoted piece
      }
    }

    this.items = items;
    this.passChips = chips;
  }

  private pieceItem(
    kind: 'slide' | 'bounce',
    color: PieceColor,
    piece: NonNullable<AnimItem['piece']>['type'],
    from: Square,
    to: Square,
  ): AnimItem {
    return {
      kind,
      piece: makePiece(piece, color, true),
      fx: this.x(from),
      fy: this.y(from),
      tx: this.x(to),
      ty: this.y(to),
      size: this.pct(),
    };
  }

  private pct(): string {
    return `${100 / this.size}%`;
  }

  private x(sq: Square): string {
    const size = this.size;
    const file = fileOf(sq, size);
    const col = this.perspective === 'white' ? file : size - 1 - file;
    return `${(col * 100) / size}%`;
  }

  private y(sq: Square): string {
    const size = this.size;
    const rank = rankOf(sq, size);
    const row = this.perspective === 'white' ? size - 1 - rank : rank;
    return `${(row * 100) / size}%`;
  }
}
