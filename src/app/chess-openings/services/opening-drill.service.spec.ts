import { TestBed } from '@angular/core/testing';
import { parseSquare } from '../../chess/engine/core/board';
import { StockfishService } from '../../chess/services/stockfish.service';
import { Opening } from '../models/opening.model';
import { OpeningDrillService } from './opening-drill.service';

const ITALIAN: Opening = {
  id: 'c50-italian-game',
  eco: 'C50',
  name: 'Italian Game',
  moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
};

describe('OpeningDrillService', () => {
  let service: OpeningDrillService;
  let stockfish: jasmine.SpyObj<StockfishService>;

  beforeEach(() => {
    stockfish = jasmine.createSpyObj('StockfishService', ['getBestMove']);
    stockfish.getBestMove.and.resolveTo('e7e5');

    TestBed.configureTestingModule({
      providers: [{ provide: StockfishService, useValue: stockfish }],
    });
    service = TestBed.inject(OpeningDrillService);
  });

  it('starts in the book phase with White to move by default', () => {
    service.start(ITALIAN, 'white', 'predefined');
    expect(service.phase()).toBe('book');
    expect(service.turnColor()).toBe('white');
    expect(service.isHumanTurn).toBe(true);
  });

  it('predefined mode: bot replies with the exact book move, staying in book phase', async () => {
    service.start(ITALIAN, 'white', 'predefined');

    const ok = await service.playHumanMove(parseSquare('e2'), parseSquare('e4'));

    expect(ok).toBe(true);
    expect(service.phase()).toBe('book');
    expect(service.moveHistory()).toEqual(['e4', 'e5']);
    expect(stockfish.getBestMove).not.toHaveBeenCalled();
  });

  it('reaches line-complete once every book move has been played', async () => {
    service.start(ITALIAN, 'white', 'predefined');
    await service.playHumanMove(parseSquare('e2'), parseSquare('e4')); // e4 e5
    await service.playHumanMove(parseSquare('g1'), parseSquare('f3')); // Nf3 Nc6
    await service.playHumanMove(parseSquare('f1'), parseSquare('c4')); // Bc4

    expect(service.phase()).toBe('line-complete');
    expect(service.moveHistory()).toEqual(ITALIAN.moves);
  });

  it('marks the drill as deviated when the human plays outside the known line', async () => {
    service.start(ITALIAN, 'white', 'predefined');

    // d4 is a legal first move but not the Italian Game's first move (e4).
    const ok = await service.playHumanMove(parseSquare('d2'), parseSquare('d4'));

    expect(ok).toBe(true);
    expect(service.phase()).toBe('deviated');
  });

  it('rejects illegal moves without changing phase or history', async () => {
    service.start(ITALIAN, 'white', 'predefined');

    const ok = await service.playHumanMove(parseSquare('e2'), parseSquare('e5'));

    expect(ok).toBe(false);
    expect(service.moveHistory()).toEqual([]);
    expect(service.phase()).toBe('book');
  });

  it('free mode: bot replies via StockfishService instead of the book', async () => {
    service.start(ITALIAN, 'white', 'free');

    await service.playHumanMove(parseSquare('e2'), parseSquare('e4'));

    expect(stockfish.getBestMove).toHaveBeenCalled();
    expect(service.moveHistory()).toEqual(['e4', 'e5']);
  });

  it('continueFreeplay switches the phase to freeplay', async () => {
    service.start(ITALIAN, 'white', 'predefined');
    await service.playHumanMove(parseSquare('e2'), parseSquare('e4'));

    service.continueFreeplay();

    expect(service.phase()).toBe('freeplay');
  });

  it('bot does not move on its own while a deviation/line-complete prompt is pending', async () => {
    service.start(ITALIAN, 'white', 'predefined');
    // d4 is legal but deviates from the Italian Game's book move (e4).
    await service.playHumanMove(parseSquare('d2'), parseSquare('d4'));

    expect(service.phase()).toBe('deviated');
    expect(service.moveHistory()).toEqual(['d4']);
    expect(stockfish.getBestMove).not.toHaveBeenCalled();
  });

  it('reset() clears the session back to the initial position', () => {
    service.start(ITALIAN, 'white', 'predefined');
    service.reset();

    expect(service.currentOpening).toBeNull();
    expect(service.moveHistory()).toEqual([]);
    expect(service.phase()).toBe('book');
  });
});
