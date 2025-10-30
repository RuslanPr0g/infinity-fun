import { Injectable } from '@angular/core';
import { GameRoute } from '../../../core/models/game-route.model';

@Injectable({
  providedIn: 'root',
})
export class GameRouteService {
  private games: GameRoute[] = [
    // {
    //   name: 'Sea Battle Probability Matrix',
    //   route: '/seabattle',
    //   color: '#299becff',
    // },
    { name: 'Reject All Cookies', route: '/reject-cookies', color: '#3A59D1' },
    { name: 'Country Guesser', route: '/country-guesser', color: '#809D3C' },
    { name: 'Math Comparer', route: '/math-comparer', color: '#B2A5FF' },
    { name: 'Color Reaction', route: '/color-click', color: '#ff6347' },
    { name: 'Months Left', route: '/left-to-live', color: '#AE445A' },
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
