import { AfterViewInit, Component, ElementRef, HostListener, input, output, viewChild } from '@angular/core';

/**
 * Dimmed backdrop with a centered card. Show it with `@if`; it emits `closed` on Esc,
 * a backdrop tap or the × button (unless `closable` is false).
 */
@Component({
  selector: 'ui-modal',
  standalone: true,
  template: `
    <div class="backdrop" (click)="closable() && closed.emit()"></div>
    <div class="ui-modal {{ size() }}" role="dialog" aria-modal="true" [attr.aria-label]="heading() || null" tabindex="-1" #card>
      @if (closable()) {
        <button type="button" class="ui-btn ghost icon x" aria-label="Close" (click)="closed.emit()">✕</button>
      }
      @if (heading()) {
        <h2 class="head">{{ heading() }}</h2>
      }
      <ng-content />
    </div>
  `,
  styleUrl: './ui-modal.component.scss',
})
export class UiModalComponent implements AfterViewInit {
  readonly heading = input<string>('');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly closable = input<boolean>(true);
  readonly closed = output<void>();

  private readonly card = viewChild.required<ElementRef<HTMLElement>>('card');

  ngAfterViewInit(): void {
    this.card().nativeElement.focus({ preventScroll: true });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.closable()) {
      this.closed.emit();
    }
  }
}
