import { DecimalPipe } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';
import { PeriodicElement } from './models/periodic.model';
import { maskName } from './periodic.engine';

/** Facts about an element for the hint sheet. The name stays hidden until you choose to show it. */
@Component({
  selector: 'app-element-details',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    @if (shown(); as el) {
      <div class="head">
        <div class="tile" [style.--tile]="color()">
          <small>{{ el.number }}</small><b>{{ el.symbol }}</b>
        </div>
        <div>
          <h3>{{ hidden() ? '???' : el.name }}</h3>
          <p class="ui-muted">{{ mask(el.category) }}</p>
        </div>
      </div>

      <div class="tools">
        <button type="button" class="ui-btn seg" [class.on]="!hidden()" (click)="reveal.set(!reveal())">{{ hidden() ? 'Show name' : 'Hide name' }}</button>
        <input class="ui-input" type="search" placeholder="Look up another element" [value]="query()" (input)="query.set($any($event.target).value)" />
      </div>
      @if (results().length) {
        <div class="results">
          @for (r of results(); track r.number) {
            <button type="button" class="ui-btn small" (click)="lookAt(r)">{{ r.symbol }} · {{ r.name }}</button>
          }
        </div>
      }

      <div class="body">
        @if (el.image?.url) {
          <img [src]="el.image!.url" [alt]="hidden() ? 'Photo of the element' : el.name" loading="lazy" />
        }
        <dl>
          @if (el.summary) { <div class="wide"><dt>About</dt><dd>{{ mask(el.summary) }}</dd></div> }
          @if (el.appearance) { <div><dt>Looks like</dt><dd>{{ mask(el.appearance) }}</dd></div> }
          @if (el.phase) { <div><dt>At room temp</dt><dd>{{ el.phase }}</dd></div> }
          @if (el.period) { <div><dt>Period</dt><dd>{{ el.period }}</dd></div> }
          @if (el.group) { <div><dt>Group</dt><dd>{{ el.group }}</dd></div> }
          @if (el.atomic_mass) { <div><dt>Atomic mass</dt><dd>{{ el.atomic_mass | number: '1.2-2' }} u</dd></div> }
          @if (el.density) { <div><dt>Density</dt><dd>{{ el.density | number: '1.2-2' }}</dd></div> }
          @if (el.melt) { <div><dt>Melts at</dt><dd>{{ el.melt | number: '1.0-0' }} K</dd></div> }
          @if (el.boil) { <div><dt>Boils at</dt><dd>{{ el.boil | number: '1.0-0' }} K</dd></div> }
          @if (el.discovered_by) { <div><dt>Found by</dt><dd>{{ mask(el.discovered_by) }}</dd></div> }
        </dl>
      </div>
      @if (el.source && !hidden()) {
        <a class="wiki" [href]="el.source" target="_blank" rel="noopener noreferrer">Read more on Wikipedia ↗</a>
      }
    }
  `,
  styleUrl: './element-details.component.scss',
})
export class ElementDetailsComponent {
  readonly element = input.required<PeriodicElement>();
  readonly elements = input<PeriodicElement[]>([]);
  readonly color = input<string>('#9ca3af');

  readonly reveal = signal(false);
  readonly query = signal('');
  private readonly other = signal<PeriodicElement | null>(null);

  /** The quiz element, or one picked from the search. */
  readonly shown = computed(() => this.other() ?? this.element());
  /** The quiz answer stays hidden unless you ask; looked-up elements are shown. */
  readonly hidden = computed(() => !this.reveal() && !this.other());
  readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    return q ? this.elements().filter((e) => e.name.toLowerCase().includes(q) || e.symbol.toLowerCase() === q).slice(0, 8) : [];
  });

  mask(text?: string | null): string {
    return this.hidden() ? maskName(text, this.shown().name) : text ?? '';
  }

  lookAt(e: PeriodicElement): void {
    this.other.set(e.number === this.element().number ? null : e);
    this.query.set('');
  }
}
