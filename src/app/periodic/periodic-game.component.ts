import { Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { LocalStorageConst } from '../core/constants/local-storage.const';
import { LocalStorageService } from '../shared/services/local-storage/local-storage.service';
import { PeriodicTableService } from '../shared/services/periodic-table/periodic-table.service';
import { SoundService } from '../shared/services/sound/sound.service';
import { GameShellComponent, SegmentOption, SegmentedComponent, StatBarComponent, UiModalComponent } from '../shared/ui';
import { ElementDetailsComponent } from './element-details.component';
import { PeriodicElement } from './models/periodic.model';
import { buildOptions, categoryColor, isElementGuess, randomElement } from './periodic.engine';

type Mode = 'pick' | 'type';
type Load = 'loading' | 'ready' | 'error';
type Result = { ok: boolean; picked?: number } | null;

const NEXT_DELAY_OK = 800;
const NEXT_DELAY_BAD = 1800;

@Component({
  selector: 'app-periodic-game',
  standalone: true,
  imports: [GameShellComponent, StatBarComponent, SegmentedComponent, UiModalComponent, ElementDetailsComponent],
  template: `
    <app-game-shell [sound]="true" [help]="help" maxWidth="560px">
      @switch (load()) {
        @case ('loading') { <p class="ui-muted">Loading the periodic table…</p> }
        @case ('error') {
          <div class="ui-panel msg">
            <p>Couldn’t load the elements. Check your connection.</p>
            <button type="button" class="ui-btn primary" (click)="fetch()">Try again</button>
          </div>
        }
        @default {
          @if (current(); as el) {
            <ui-stat-bar [stats]="[{ label: 'Streak', value: streak(), hot: streak() > 0 && streak() >= best() }, { label: 'Best', value: best() }]" />

            <div class="play">
            <div class="card ui-panel" [class.ok]="result()?.ok === true" [class.bad]="result()?.ok === false">
              <div class="tile" [style.--tile]="color()">
                <small>{{ el.number }}</small>
                <b>{{ el.symbol }}</b>
                <span>{{ result() ? el.name : '?' }}</span>
              </div>
              @if (el.image?.url) {
                <img class="photo" [src]="el.image!.url" alt="Photo of the element" />
              }
            </div>

            <div class="answers">
            @if (mode() === 'pick') {
              <div class="options">
                @for (o of options(); track o.number; let i = $index) {
                  <button type="button" class="ui-btn option" [class.right]="result() && o.number === el.number"
                    [class.wrong]="result()?.picked === o.number && !result()?.ok" [disabled]="!!result()" (click)="pick(o)">
                    <kbd>{{ i + 1 }}</kbd>{{ o.name }}
                  </button>
                }
              </div>
            } @else {
              <form class="typed" (submit)="$event.preventDefault(); check()">
                <input #g class="ui-input" [class.good]="result()?.ok === true" [class.bad]="result()?.ok === false" [value]="typed()"
                  (input)="typed.set(g.value)" placeholder="Element name" autocomplete="off" autocapitalize="words" spellcheck="false"
                  enterkeyhint="done" aria-label="Element name" [readOnly]="!!result()" />
                <button type="submit" class="ui-btn primary" [disabled]="!typed().trim() || !!result()">Check</button>
              </form>
            }
            <p class="note" [class.show]="result()?.ok === false">It’s <b>{{ el.name }}</b>.</p>
            </div>
            </div>

            <div class="row">
              <button type="button" class="ui-btn ghost small" (click)="detailsOpen.set(true)">Hints</button>
              <button type="button" class="ui-btn ghost small" [disabled]="!!result()" (click)="giveUp()">Show answer</button>
            </div>
            <ui-segmented label="Answer mode" [options]="modes" [value]="mode()" (valueChange)="setMode($event)" />
          }
        }
      }

      @if (detailsOpen() && current(); as el) {
        <ui-modal size="lg" (closed)="detailsOpen.set(false)">
          <app-element-details [element]="el" [elements]="elements()" [color]="color()" />
        </ui-modal>
      }
    </app-game-shell>
  `,
  styleUrl: './periodic-game.component.scss',
})
export class PeriodicGameComponent {
  private readonly table = inject(PeriodicTableService);
  private readonly storage = inject(LocalStorageService);
  private readonly sound = inject(SoundService);

  readonly help = [
    'You see an element’s symbol and number. Name the element.',
    'Choose: pick one of four names (keys 1 to 4 work too).',
    'Type: write the name yourself. “Aluminum” and “aluminium” both count.',
    'Stuck? “Hints” shows facts about it with the name hidden.',
  ];
  readonly modes: SegmentOption<Mode>[] = [
    { value: 'pick', label: 'Choose' },
    { value: 'type', label: 'Type' },
  ];

  readonly load = signal<Load>('loading');
  readonly elements = signal<PeriodicElement[]>([]);
  readonly current = signal<PeriodicElement | null>(null);
  readonly options = signal<PeriodicElement[]>([]);
  readonly mode = signal<Mode>('pick');
  readonly typed = signal('');
  readonly result = signal<Result>(null);
  readonly detailsOpen = signal(false);
  readonly streak = signal(0);
  readonly best = signal(this.storage.getItem<number>(LocalStorageConst.PeriodicBest) ?? 0);

  readonly color = computed(() => categoryColor(this.current()?.category));

  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
    this.fetch();
  }

  fetch(): void {
    this.load.set('loading');
    this.table.getElements().subscribe({
      next: (list) => {
        this.elements.set(list);
        this.load.set(list.length ? 'ready' : 'error');
        this.next();
      },
      error: () => this.load.set('error'),
    });
  }

  setMode(m: Mode): void {
    this.mode.set(m);
    this.next();
  }

  pick(o: PeriodicElement): void {
    if (!this.result()) {
      this.finish(o.number === this.current()?.number, o.number);
    }
  }

  check(): void {
    const el = this.current();
    if (el && !this.result() && this.typed().trim()) {
      this.finish(isElementGuess(this.typed(), el));
    }
  }

  giveUp(): void {
    if (!this.result()) {
      this.finish(false);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (this.mode() !== 'pick' || this.detailsOpen() || (e.target as HTMLElement | null)?.tagName === 'INPUT') {
      return;
    }
    const o = this.options()[Number(e.key) - 1];
    if (o) {
      this.pick(o);
    }
  }

  private finish(ok: boolean, picked?: number): void {
    this.result.set({ ok, picked });
    if (ok) {
      this.sound.playCorrect();
      this.streak.update((s) => s + 1);
      if (this.streak() > this.best()) {
        this.best.set(this.streak());
        this.storage.setItem(LocalStorageConst.PeriodicBest, this.best());
      }
    } else {
      this.sound.playWrong();
      this.streak.set(0);
    }
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.next(), ok ? NEXT_DELAY_OK : NEXT_DELAY_BAD);
  }

  private next(): void {
    clearTimeout(this.timer);
    const all = this.elements();
    if (!all.length) {
      return;
    }
    const el = randomElement(all, Math.random, this.current() ?? undefined);
    this.current.set(el);
    this.options.set(buildOptions(el, all));
    this.typed.set('');
    this.result.set(null);
  }
}
