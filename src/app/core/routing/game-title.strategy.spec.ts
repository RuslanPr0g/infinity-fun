import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot } from '@angular/router';
import { GameTitleStrategy } from './game-title.strategy';

function snapshotFor(path: string): RouterStateSnapshot {
  const leaf = { routeConfig: { path }, firstChild: null };
  return { root: { routeConfig: null, firstChild: leaf } } as unknown as RouterStateSnapshot;
}

describe('GameTitleStrategy', () => {
  it('names the game, and falls back to the site name', () => {
    const strategy = TestBed.inject(GameTitleStrategy);
    const title = TestBed.inject(Title);
    strategy.updateTitle(snapshotFor('chess'));
    expect(title.getTitle()).toBe('Unusual Chess · Infinity Fun');
    strategy.updateTitle(snapshotFor(''));
    expect(title.getTitle()).toBe('Infinity Fun');
  });
});
