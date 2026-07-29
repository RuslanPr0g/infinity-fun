import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import { Opening } from '../models/opening.model';
import { OpeningQuizService } from './opening-quiz.service';

const SET: Opening[] = [
  { id: 'c50-italian-game', eco: 'C50', name: 'Italian Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'] },
  { id: 'b20-sicilian-defense', eco: 'B20', name: 'Sicilian Defense', moves: ['e4', 'c5'] },
  { id: 'c60-ruy-lopez', eco: 'C60', name: 'Ruy Lopez', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'] },
];

describe('OpeningQuizService', () => {
  let service: OpeningQuizService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OpeningQuizService);
    service.start(SET);
  });

  it('starts with the full practice set shuffled and the score reset', () => {
    expect(service.practiceSet().length).toBe(SET.length);
    expect(new Set(service.practiceSet().map((o) => o.id))).toEqual(new Set(SET.map((o) => o.id)));
    expect(service.score()).toBe(0);
    expect(service.answered()).toBe(0);
    expect(service.finished()).toBe(false);
  });

  it('reveals a few opening moves up front, capped at the opening length', () => {
    const revealed = service.revealedMoves();
    const opening = service.current()!;
    expect(revealed.length).toBe(Math.min(3, opening.moves.length));
    expect(revealed).toEqual(opening.moves.slice(0, revealed.length));
  });

  it('revealNextMove reveals one more move up to the full line', () => {
    const opening = service.current()!;
    for (let i = service.revealedMoveCount(); i < opening.moves.length; i++) {
      service.revealNextMove();
    }
    expect(service.revealedMoveCount()).toBe(opening.moves.length);
    expect(service.canRevealMore()).toBe(false);

    // Revealing further doesn't overshoot the opening's move list.
    service.revealNextMove();
    expect(service.revealedMoveCount()).toBe(opening.moves.length);
  });

  it('searchCandidates only returns entries from the practice set, matching the query', () => {
    const candidates = service.searchCandidates('sicilian');
    expect(candidates.map((o) => o.id)).toEqual(['b20-sicilian-defense']);
    expect(service.searchCandidates('')).toEqual([]);
  });

  it('submitGuess scores a correct guess and blocks a second submission', () => {
    const opening = service.current()!;
    const correct = service.submitGuess(opening.id);

    expect(correct).toBe(true);
    expect(service.lastResult()).toBe('correct');
    expect(service.score()).toBe(1);
    expect(service.answered()).toBe(1);

    // Already answered — a second guess is ignored.
    const second = service.submitGuess('some-other-id');
    expect(second).toBe(false);
    expect(service.answered()).toBe(1);
  });

  it('submitGuess records an incorrect guess without scoring', () => {
    const opening = service.current()!;
    const wrongId = SET.find((o) => o.id !== opening.id)!.id;

    const correct = service.submitGuess(wrongId);

    expect(correct).toBe(false);
    expect(service.lastResult()).toBe('incorrect');
    expect(service.score()).toBe(0);
    expect(service.answered()).toBe(1);
  });

  it('skip records an answer without scoring', () => {
    service.skip();
    expect(service.lastResult()).toBe('skipped');
    expect(service.answered()).toBe(1);
    expect(service.score()).toBe(0);
  });

  it('next() advances through the whole practice set and finishes at the end', () => {
    for (let i = 0; i < SET.length; i++) {
      expect(service.finished()).toBe(false);
      service.skip();
      service.next();
    }
    expect(service.finished()).toBe(true);
    expect(service.answered()).toBe(SET.length);
  });

  // Feature: chess-openings-trainer, Property: quiz candidates are always a subset of the practice set
  it('searchCandidates never returns an opening outside the practice set', () => {
    fc.assert(
      fc.property(fc.constantFrom('e', 'a', 'i', 'z', 'sicilian', 'ruy', ''), (query) => {
        const practiceIds = new Set(service.practiceSet().map((o) => o.id));
        expect(service.searchCandidates(query).every((o) => practiceIds.has(o.id))).toBe(true);
      }),
    );
  });
});
