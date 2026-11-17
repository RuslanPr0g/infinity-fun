import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LocalStorageConst } from '../core/constants/local-storage.const';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    localStorage.removeItem(LocalStorageConst.RecentGames);
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.removeItem(LocalStorageConst.RecentGames));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('lists every game exactly once across the category sections', () => {
    const shown = component.sections().flatMap((s) => s.games.map((g) => g.route));
    expect(shown.length).toBe(component.games.length);
    expect(new Set(shown).size).toBe(component.games.length);
  });

  it('renders one card per game with cover art', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.card').length).toBe(component.games.length);
    expect(el.querySelectorAll('.card app-game-art svg').length).toBe(component.games.length);
  });

  it('filters by category', () => {
    component.filter.set('strategy');
    const sections = component.sections();
    expect(sections.length).toBe(1);
    expect(sections[0].games.every((g) => g.category === 'strategy')).toBeTrue();
    expect(component.browsing()).toBeFalse();
  });

  it('searches names and descriptions, case-insensitively', () => {
    component.query.set('CHESS');
    const hits = component.sections()[0].games.map((g) => g.route);
    expect(hits).toContain('/chess');
    expect(hits).toContain('/chessle');
    expect(hits).not.toContain('/math-quiz');
  });

  it('shows the empty state when nothing matches', () => {
    component.query.set('zzzz-no-such-game');
    fixture.detectChanges();
    expect(component.sections().length).toBe(0);
    expect((fixture.nativeElement as HTMLElement).querySelector('.empty')).not.toBeNull();
  });

  it('remembers recently played games, newest first, without duplicates', () => {
    const [a, b] = component.games;
    component.remember(a);
    component.remember(b);
    component.remember(a);
    expect(component.recent().map((g) => g.route)).toEqual([a.route, b.route]);
    expect(JSON.parse(localStorage.getItem(LocalStorageConst.RecentGames)!)).toEqual([a.route, b.route]);
  });
});
