import { Injectable } from '@angular/core';
import { GameRoute } from '../../../core/models/game-route.model';

@Injectable({
  providedIn: 'root',
})
export class GameRouteService {
  // Please, make sure that the colors are matching the color scheme here: _colors.scss
  private games: GameRoute[] = [
    {
      name: 'Sea Battle Matrix',
      route: '/seabattle',
      color: '#0EA5E9',
    },
    {
      name: 'Reject All Cookies',
      route: '/reject-cookies',
      color: '#6366F1',
    },
    {
      name: 'Country Guesser',
      route: '/country-guesser',
      color: '#10B981',
    },
    {
      name: 'Guess Day of Week',
      route: '/guess-day-of-week',
      color: '#F59E0B',
    },
    {
      name: 'Math Comparer',
      route: '/math-comparer',
      color: '#8B5CF6',
    },
    {
      name: 'Color Reaction',
      route: '/color-click',
      color: '#EC4899',
    },
    {
      name: 'Months Left',
      route: '/left-to-live',
      color: '#EF4444',
    },
    {
      name: 'Algorithms Graph',
      route: 'https://ruslanpr0g.github.io/algo-graph/',
      color: '#6B7280',
      isExternal: true,
    },
  ];

  getGames(): GameRoute[] {
    return this.games;
  }
}
