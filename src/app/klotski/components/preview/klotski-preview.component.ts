import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Piece } from '../../models/klotski.models';
import { KIND_SIZE } from '../../services/klotski-engine.service';

/** Read-only miniature of a position picked on the graph. */
@Component({
  selector: 'app-klotski-preview',
  standalone: true,
  template: `
    <div class="preview" role="dialog" aria-label="Position preview">
      <button type="button" class="close" (click)="closed.emit()" aria-label="Close preview">×</button>
      <div class="mini-board">
        @for (p of pieces; track p.id) {
          <div
            class="piece"
            [attr.data-kind]="p.kind"
            [style.left.%]="p.col * 25"
            [style.top.%]="p.row * 20"
            [style.width.%]="size(p).w * 25"
            [style.height.%]="size(p).h * 20"
          ></div>
        }
      </div>
      <dl>
        <dt>Moves left</dt>
        <dd>{{ movesLeft === 0 ? 'solved' : movesLeft }}</dd>
        <dt>From start</dt>
        <dd>{{ fromStart }}</dd>
      </dl>
      @if (label) {
        <p class="tag">{{ label }}</p>
      }
    </div>
  `,
  styleUrl: './klotski-preview.component.scss',
})
export class KlotskiPreviewComponent {
  @Input({ required: true }) pieces: readonly Piece[] = [];
  @Input() movesLeft = 0;
  @Input() fromStart = 0;
  @Input() label = '';
  @Output() closed = new EventEmitter<void>();

  size(p: Piece): { w: number; h: number } {
    return KIND_SIZE[p.kind];
  }
}
