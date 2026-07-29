import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import { Opening } from '../models/opening.model';
import { POPULAR_OPENING_NAMES } from '../data/popular-openings.const';
import { OpeningLibraryService } from './opening-library.service';

const FIXTURE: Opening[] = [
  { id: 'c50-italian-game', eco: 'C50', name: 'Italian Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'] },
  { id: 'b20-sicilian-defense', eco: 'B20', name: 'Sicilian Defense', moves: ['e4', 'c5'] },
  { id: 'a00-amar-opening', eco: 'A00', name: 'Amar Opening', moves: ['Nh3'] },
  { id: 'c60-ruy-lopez', eco: 'C60', name: 'Ruy Lopez', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'] },
];

describe('OpeningLibraryService', () => {
  let service: OpeningLibraryService;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OpeningLibraryService);
    spyOn(window, 'fetch').and.resolveTo({
      ok: true,
      json: () => Promise.resolve(FIXTURE),
    } as Response);
    await service.ensureLoaded();
  });

  it('loads the dataset once and exposes it via the openings signal', () => {
    expect(service.loaded()).toBe(true);
    expect(service.openings().length).toBe(FIXTURE.length);
  });

  it('only fetches once across repeated ensureLoaded() calls', async () => {
    await service.ensureLoaded();
    await service.ensureLoaded();
    expect(window.fetch).toHaveBeenCalledTimes(1);
  });

  it('search matches by name or ECO code, case-insensitively', () => {
    expect(service.search('sicilian').map((o) => o.id)).toEqual(['b20-sicilian-defense']);
    expect(service.search('SICILIAN').map((o) => o.id)).toEqual(['b20-sicilian-defense']);
    expect(service.search('c5').length).toBeGreaterThanOrEqual(1); // matches ECO "C50" and "C60"
    expect(service.search('   ')).toEqual([]);
  });

  it('popular() returns exactly the entries whose name is in the curated shortlist', () => {
    const popular = service.popular();
    const expectedIds = new Set(
      FIXTURE.filter((o) => POPULAR_OPENING_NAMES.includes(o.name)).map((o) => o.id),
    );
    expect(new Set(popular.map((o) => o.id))).toEqual(expectedIds);
  });

  it('popular() is always a subset of the full dataset', () => {
    fc.assert(
      fc.property(fc.constantFrom(...FIXTURE.map((o) => o.id)), () => {
        const allIds = new Set(service.openings().map((o) => o.id));
        expect(service.popular().every((o) => allIds.has(o.id))).toBe(true);
      }),
    );
  });

  it('byId finds an opening by its id and returns undefined otherwise', () => {
    expect(service.byId('c50-italian-game')?.name).toBe('Italian Game');
    expect(service.byId('does-not-exist')).toBeUndefined();
  });

  // Feature: chess-openings-trainer, Property: search results always contain the query substring
  it('every search result actually contains the query in its name or ECO', () => {
    fc.assert(
      fc.property(fc.constantFrom('e', 'sicilian', 'c5', 'ruy', 'nonexistentxyz'), (query) => {
        const allMatch = service
          .search(query)
          .every(
            (o) =>
              o.name.toLowerCase().includes(query.toLowerCase()) ||
              o.eco.toLowerCase().includes(query.toLowerCase()),
          );
        expect(allMatch).toBe(true);
      }),
    );
  });
});
