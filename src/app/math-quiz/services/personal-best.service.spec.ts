import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import { LocalStorageService } from '../../shared/services/local-storage/local-storage.service';
import { Difficulty, GameMode } from '../models/math-quiz.models';
import { PersonalBestService } from './personal-best.service';

const MODES: GameMode[] = [
  'multiplication',
  'division',
  'mixed',
  'power-roots',
  'sequence',
  'estimation',
];
const DIFFS: Difficulty[] = ['easy', 'medium', 'hard'];

describe('PersonalBestService', () => {
  let service: PersonalBestService;
  let storage: jasmine.SpyObj<LocalStorageService>;
  const store = new Map<string, unknown>();

  beforeEach(() => {
    store.clear();
    storage = jasmine.createSpyObj('LocalStorageService', [
      'getItem',
      'setItem',
      'removeItem',
      'clear',
    ]);
    storage.getItem.and.callFake(<T>(key: string) =>
      store.has(key) ? (store.get(key) as T) : null,
    );
    storage.setItem.and.callFake(<T>(key: string, value: T) => {
      store.set(key, value);
    });

    TestBed.configureTestingModule({
      providers: [
        PersonalBestService,
        { provide: LocalStorageService, useValue: storage },
      ],
    });
    service = TestBed.inject(PersonalBestService);
  });

  // Feature: math-quiz-game, Property 14: PersonalBest round-trip consistency
  it('Property 14: setPersonalBest then getPersonalBest returns the same score', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...MODES),
        fc.constantFrom(...DIFFS),
        fc.integer({ min: 0, max: 1000 }),
        (mode, difficulty, score) => {
          service.setPersonalBest(mode, difficulty, score);
          expect(service.getPersonalBest(mode, difficulty)).toBe(score);
        },
      ),
    );
  });

  // Feature: math-quiz-game, Property 15: PersonalBest storage key format
  it('Property 15: storage key equals math-quiz-best-{mode}-{difficulty}', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...MODES),
        fc.constantFrom(...DIFFS),
        fc.integer({ min: 0, max: 500 }),
        (mode, difficulty, score) => {
          storage.setItem.calls.reset();
          service.setPersonalBest(mode, difficulty, score);
          expect(storage.setItem).toHaveBeenCalledWith(
            `math-quiz-best-${mode}-${difficulty}`,
            jasmine.any(Object),
          );
        },
      ),
    );
  });

  // Requirements 16.3
  it('getPersonalBest returns 0 when localStorage is empty', () => {
    storage.getItem.and.returnValue(null);
    expect(service.getPersonalBest('multiplication', 'easy')).toBe(0);
  });
});
