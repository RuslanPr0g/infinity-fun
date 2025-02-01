import { Injectable } from '@angular/core';
import { GameRoute } from '../../../core/models/game-route.model';

@Injectable({
  providedIn: 'root',
})
export class GameRouteService {
  private games: GameRoute[] = [
    { name: 'Country Guesser', route: '/country-guesser', color: '#809D3C' },
    { name: 'Math Comparer', route: '/math-comparer', color: '#B2A5FF' },
    { name: 'Color Reaction', route: '/color-click', color: '#ff6347' },
    {
      name: 'Algorithms Graph',
      route: 'https://ruslanpr0g.github.io/algo-graph/',
      color: '#C8AAAA',
      isExternal: true,
    },
  ];

  getGames(): GameRoute[] {
    return this.games;
  }
}
