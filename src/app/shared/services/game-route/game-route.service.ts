import { Injectable } from '@angular/core';
import { GameRoute } from '../../../core/models/game-route.model';

@Injectable({
  providedIn: 'root',
})
export class GameRouteService {
  private games: GameRoute[] = [
    {
      name: 'Sea Battle Matrix',
      route: '/seabattle',
      color: '#0EA5E9',
      imageUrl: '/images/seabattle.jpg',
    },
    {
      name: 'Reject All Cookies',
      route: '/reject-cookies',
      color: '#6366F1',
      imageUrl: '/images/cookies.jpg',
    },
    {
      name: 'Country Guesser',
      route: '/country-guesser',
      color: '#10B981',
      imageUrl: '/images/guessaflag.jpg',
    },
    {
      name: 'Guess Day of Week',
      route: '/guess-day-of-week',
      color: '#F59E0B',
      imageUrl: '/images/calendar.jpg',
    },
    {
      name: 'Math Comparer',
      route: '/math-comparer',
      color: '#8B5CF6',
      imageUrl: '/images/math.jpg',
    },
    {
      name: 'Color Reaction',
      route: '/color-click',
      color: '#EC4899',
      imageUrl: '/images/reaction.jpg',
    },
    {
      name: 'Months Left',
      route: '/left-to-live',
      color: '#EF4444',
      imageUrl: '/images/months.jpg',
    },
    {
      name: 'Algorithms Graph',
      route: 'https://ruslanpr0g.github.io/algo-graph/',
      color: '#6B7280',
      imageUrl: '/images/graphs.jpg',
      isExternal: true,
    },
  ];

  getGames(): GameRoute[] {
    return this.games;
  }
}
