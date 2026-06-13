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
});
