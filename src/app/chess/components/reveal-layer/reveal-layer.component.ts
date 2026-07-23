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
  fileOf,
  makePiece,
  opponentOf,
  rankOf,
} from '../../engine/core/board';
import { RoundResolution } from '../../engine/variant';
import { ChessPieceComponent } from '../piece/chess-piece.component';

interface AnimItem {
  kind: 'slide' | 'bounce' | 'victim' | 'miss';
  piece: Piece | null;
  fx: string;
  fy: string;
  tx: string;
  ty: string;
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
              >✕</span
            >
          }
          @case ('victim') {
            <span
              class="glyph victim"
              [style.left]="item.fx"
              [style.top]="item.fy"
            >
              <app-chess-piece [piece]="item.piece!" />
            </span>
          }
          @default {
            <span
              class="glyph"
              [class.slide]="item.kind === 'slide'"
              [class.bounce]="item.kind === 'bounce'"
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
    };
  }

  private x(sq: Square): string {
    const file = fileOf(sq);
    const col = this.perspective === 'white' ? file : 7 - file;
    return `${col * 12.5}%`;
  }

  private y(sq: Square): string {
    const rank = rankOf(sq);
    const row = this.perspective === 'white' ? 7 - rank : rank;
    return `${row * 12.5}%`;
  }
}
