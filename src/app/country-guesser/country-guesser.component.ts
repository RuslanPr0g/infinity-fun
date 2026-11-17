import { Component, HostListener, OnDestroy, computed, inject, signal } from '@angular/core';
import { LocalStorageConst } from '../core/constants/local-storage.const';
import { LocalStorageService } from '../shared/services/local-storage/local-storage.service';
import { SoundService } from '../shared/services/sound/sound.service';
import { GameShellComponent, SegmentOption, SegmentedComponent, StatBarComponent } from '../shared/ui';
import { COUNTRIES, buildOptions, flagUrl, isCorrectGuess, randomCountry } from './country-guesser.engine';
import { Country } from './models/country.model';

type Mode = 'pick' | 'type';
type Result = { ok: boolean; picked?: Country } | null;

const NEXT_DELAY_OK = 700;
const NEXT_DELAY_BAD = 1600;

@Component({
  selector: 'app-country-guesser',
  standalone: true,
  imports: [GameShellComponent, StatBarComponent, SegmentedComponent],
  template: `
    <app-game-shell [sound]="true" [help]="help" maxWidth="560px">
      <ui-stat-bar [stats]="[{ label: 'Streak', value: streak(), hot: streak() > 0 && streak() >= best() }, { label: 'Best', value: best() }]" />

      <div class="play">
      <figure class="flag ui-panel" [class.ok]="result()?.ok === true" [class.bad]="result()?.ok === false">
        <img [src]="flag()" [class.mono]="mono()" alt="Flag to guess" draggable="false" />
      </figure>

      <div class="answers">
      @if (mode() === 'pick') {
        <div class="options">
          @for (c of options(); track c.code; let i = $index) {
            <button type="button" class="ui-btn option" [class.right]="result() && c.code === country().code"
              [class.wrong]="result()?.picked?.code === c.code && !result()?.ok" [disabled]="!!result()" (click)="answer(c)">
              <kbd>{{ i + 1 }}</kbd><span>{{ c.name }}</span>
            </button>
          }
        </div>
      } @else {
        <form class="typed" (submit)="$event.preventDefault(); answerTyped()">
          <input #guess class="ui-input" [class.good]="result()?.ok === true" [class.bad]="result()?.ok === false" [value]="typed()"
            (input)="typed.set(guess.value)" placeholder="Country name" autocomplete="off" autocapitalize="words" spellcheck="false"
            enterkeyhint="done" aria-label="Country name" [readOnly]="!!result()" />
          <button type="submit" class="ui-btn primary" [disabled]="!typed().trim() || !!result()">Check</button>
        </form>
        <p class="reveal" [class.show]="result()?.ok === false">It was <b>{{ country().name }}</b></p>
      }
      </div>
      </div>

      <div class="settings">
        <ui-segmented label="Answer mode" [options]="modes" [value]="mode()" (valueChange)="setMode($event)" />
        <button type="button" class="ui-btn seg" [class.on]="mono()" [attr.aria-pressed]="mono()" (click)="mono.set(!mono())">Black &amp; white</button>
      </div>
    </app-game-shell>
  `,
  styleUrl: './country-guesser.component.scss',
})
export class CountryGuesserGameComponent implements OnDestroy {
  private readonly sound = inject(SoundService);
  private readonly storage = inject(LocalStorageService);

  readonly help = [
    'Look at the flag and name the country.',
    'Choose: pick one of five answers (keys 1 to 5 work too).',
    'Type: write the name yourself. Case and accents don’t matter.',
    'Black & white hides the colors, for a real challenge.',
    'A wrong answer ends your streak and shows the right one.',
  ];
  readonly modes: SegmentOption<Mode>[] = [
    { value: 'pick', label: 'Choose' },
    { value: 'type', label: 'Type' },
  ];

  readonly mode = signal<Mode>('pick');
  readonly mono = signal(false);
  readonly country = signal<Country>(this.restoreCountry());
  readonly options = signal<Country[]>(buildOptions(this.country()));
  readonly typed = signal('');
  readonly result = signal<Result>(null);
  readonly streak = signal(this.storage.getItem<number>(LocalStorageConst.CountryGuesserStreak) ?? 0);
  readonly best = signal(Math.max(this.storage.getItem<number>(LocalStorageConst.CountryGuesserMaxStreak) ?? 0, this.streak()));

  readonly flag = computed(() => flagUrl(this.country()));

  private timer?: ReturnType<typeof setTimeout>;

  setMode(m: Mode): void {
    this.mode.set(m);
    this.next();
  }

  answer(c: Country): void {
    if (!this.result()) {
      this.finish(c.code === this.country().code, c);
    }
  }

  answerTyped(): void {
    if (!this.result() && this.typed().trim()) {
      this.finish(isCorrectGuess(this.typed(), this.country()));
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (this.mode() !== 'pick' || (e.target as HTMLElement | null)?.tagName === 'INPUT') {
      return;
    }
    const n = Number(e.key);
    const c = this.options()[n - 1];
    if (c) {
      this.answer(c);
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }

  private finish(ok: boolean, picked?: Country): void {
    this.result.set({ ok, picked });
    if (ok) {
      this.sound.playCorrect();
      this.setStreak(this.streak() + 1);
    } else {
      this.sound.playWrong();
      this.setStreak(0);
    }
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.next(), ok ? NEXT_DELAY_OK : NEXT_DELAY_BAD);
  }

  private next(): void {
    clearTimeout(this.timer);
    const c = randomCountry(Math.random, this.country());
    this.country.set(c);
    this.options.set(buildOptions(c));
    this.typed.set('');
    this.result.set(null);
    this.storage.setItem(LocalStorageConst.CountryGuesserCountry, c.code);
  }

  private setStreak(n: number): void {
    this.streak.set(n);
    this.storage.setItem(LocalStorageConst.CountryGuesserStreak, n);
    if (n > this.best()) {
      this.best.set(n);
      this.storage.setItem(LocalStorageConst.CountryGuesserMaxStreak, n);
    }
  }

  private restoreCountry(): Country {
    const code = this.storage.getItem<string>(LocalStorageConst.CountryGuesserCountry);
    return COUNTRIES.find((c) => c.code === code) ?? randomCountry();
  }
}
