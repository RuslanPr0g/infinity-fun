import { NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, HostListener, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocalStorageConst } from '../core/constants/local-storage.const';
import { GameCategory, GameRoute } from '../core/models/game-route.model';
import { GameRouteService } from '../shared/services/game-route/game-route.service';
import { LocalStorageService } from '../shared/services/local-storage/local-storage.service';
import { GameArtComponent } from './game-art/game-art.component';
import { StarfieldComponent } from './starfield/starfield.component';
import { environment } from '../../environments/environment';

type Filter = GameCategory | 'all';

const MAX_RECENT = 4;

/** Data-driven games dashboard: hero + search, category chips, featured game, recently played, sections. */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet, GameArtComponent, StarfieldComponent],
  template: `
    <app-starfield />
    <div class="home">
      <header class="hero">
        <div class="kicker">{{ games.length }} free browser games · no sign-up</div>
        <h1>Infinity <span>Fun</span></h1>
        <p class="tag">Strategy, puzzles, quizzes and odd little experiments. Pick one and lose an evening.</p>

        <div class="search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          <input #search type="search" placeholder="Search games…" aria-label="Search games"
            [value]="query()" (input)="query.set(search.value)" (keydown.escape)="query.set(''); search.blur()" />
          <kbd>/</kbd>
        </div>

        <nav class="chips" aria-label="Categories">
          @for (c of chips(); track c.id) {
            <button type="button" class="chip" [class.on]="filter() === c.id" (click)="filter.set(c.id)">
              {{ c.name }} <span>{{ c.count }}</span>
            </button>
          }
        </nav>
      </header>

      @if (browsing() && featured(); as f) {
        <a class="featured" [style.--c]="f.color" [routerLink]="f.route" (click)="remember(f)">
          <app-game-art class="f-art" [route]="f.route" [style.color]="f.color" />
          <div class="f-body">
            <span class="badge">NEW</span>
            <h2>{{ f.name }}</h2>
            <p>{{ f.description }}</p>
            <span class="play">Play <b>→</b></span>
          </div>
        </a>
      }

      @if (browsing() && recent().length) {
        <section class="recent">
          <h3>Jump back in</h3>
          <div class="recent-row">
            @for (g of recent(); track g.route) {
              @if (g.isExternal) {
                <a class="mini" [style.--c]="g.color" [href]="g.route" target="_blank" rel="noopener" (click)="remember(g)">
                  <app-game-art class="mini-art" [route]="g.route" [style.color]="g.color" /><span>{{ g.name }}</span>
                </a>
              } @else {
                <a class="mini" [style.--c]="g.color" [routerLink]="g.route" (click)="remember(g)">
                  <app-game-art class="mini-art" [route]="g.route" [style.color]="g.color" /><span>{{ g.name }}</span>
                </a>
              }
            }
          </div>
        </section>
      }

      @for (s of sections(); track s.id) {
        <section class="cat">
          <div class="cat-head">
            <h3>{{ s.name }}</h3>
            <span>{{ s.blurb }}</span>
          </div>
          <ul class="grid">
            @for (g of s.games; track g.route) {
              <li>
                @if (g.isExternal) {
                  <a class="card" [style.--c]="g.color" [href]="g.route" target="_blank" rel="noopener" (click)="remember(g)">
                    <ng-container *ngTemplateOutlet="body; context: { $implicit: g }" />
                  </a>
                } @else {
                  <a class="card" [style.--c]="g.color" [routerLink]="g.route" (click)="remember(g)">
                    <ng-container *ngTemplateOutlet="body; context: { $implicit: g }" />
                  </a>
                }
              </li>
            }
          </ul>
        </section>
      } @empty {
        <div class="empty">
          <p>No games match “{{ query() }}”.</p>
          <button type="button" class="chip" (click)="query.set(''); filter.set('all')">Show all games</button>
        </div>
      }

      <footer class="foot">Infinity Fun · {{ version }}</footer>
    </div>

    <ng-template #body let-g>
      <app-game-art class="art" [route]="g.route" [style.color]="g.color" />
      <div class="body">
        <div class="name">
          <span>{{ g.name }}</span>
          @if (g.isNew) { <span class="badge">NEW</span> }
          @if (g.isExternal) { <span class="ext" title="Opens in a new tab">↗</span> }
        </div>
        <p>{{ g.description }}</p>
      </div>
    </ng-template>
  `,
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly gameService = inject(GameRouteService);
  private readonly storage = inject(LocalStorageService);
  private readonly searchEl = viewChild.required<ElementRef<HTMLInputElement>>('search');

  readonly version = environment.releaseVersion;
  readonly games = this.gameService.getGames();
  readonly categories = this.gameService.getCategories();
  readonly query = signal('');
  readonly filter = signal<Filter>('all');
  private readonly recentRoutes = signal<string[]>(this.storage.getItem<string[]>(LocalStorageConst.RecentGames) ?? []);

  /** Plain browsing: no search text and no category picked. */
  readonly browsing = computed(() => this.filter() === 'all' && this.query().trim() === '');

  readonly featured = computed(() => this.games.find((g) => g.isNew) ?? null);

  readonly recent = computed(() =>
    this.recentRoutes()
      .map((r) => this.games.find((g) => g.route === r))
      .filter((g): g is GameRoute => !!g),
  );

  readonly chips = computed(() => [
    { id: 'all' as Filter, name: 'All games', count: this.games.length },
    ...this.categories.map((c) => ({ id: c.id as Filter, name: c.name, count: this.games.filter((g) => g.category === c.id).length })),
  ]);

  readonly sections = computed(() => {
    const q = this.query().trim().toLowerCase();
    const f = this.filter();
    const match = (g: GameRoute): boolean =>
      (f === 'all' || g.category === f) &&
      (!q || `${g.name} ${g.description ?? ''} ${this.categoryName(g.category)}`.toLowerCase().includes(q));
    if (q) {
      const hits = this.games.filter(match);
      return hits.length ? [{ id: 'results', name: `${hits.length} result${hits.length > 1 ? 's' : ''}`, blurb: '', games: hits }] : [];
    }
    return this.categories
      .filter((c) => f === 'all' || c.id === f)
      .map((c) => ({ id: c.id as string, name: c.name, blurb: c.blurb, games: this.games.filter((g) => g.category === c.id && match(g)) }))
      .filter((s) => s.games.length);
  });

  remember(game: GameRoute): void {
    const next = [game.route, ...this.recentRoutes().filter((r) => r !== game.route)].slice(0, MAX_RECENT);
    this.recentRoutes.set(next);
    this.storage.setItem(LocalStorageConst.RecentGames, next);
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
      e.preventDefault();
      this.searchEl().nativeElement.focus();
    }
  }

  private categoryName(id: GameCategory | undefined): string {
    return this.categories.find((c) => c.id === id)?.name ?? '';
  }
}
