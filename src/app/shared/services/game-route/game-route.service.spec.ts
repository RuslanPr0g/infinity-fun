import { TestBed } from '@angular/core/testing';
import { GameRouteService } from './game-route.service';

describe('GameRouteService', () => {
  let service: GameRouteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GameRouteService);
  });

  // Requirements 1.2
  it('includes math-quiz entry', () => {
    const games = service.getGames();
    const mathQuiz = games.find((g) => g.route === '/math-quiz');
    expect(mathQuiz).toBeDefined();
    expect(mathQuiz?.name).toBe('Math Quiz');
    expect(mathQuiz?.color).toBe('#f97316');
  });

  it('gives every game a known category and a description', () => {
    const ids = service.getCategories().map((c) => c.id);
    for (const g of service.getGames()) {
      expect(ids).withContext(g.name).toContain(g.category!);
      expect(g.description?.length).withContext(g.name).toBeGreaterThan(10);
    }
  });

  it('has unique routes', () => {
    const routes = service.getGames().map((g) => g.route);
    expect(new Set(routes).size).toBe(routes.length);
  });
});
