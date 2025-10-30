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
      color: '#299becff',
      imageUrl: '/images/seabattle.jpg',
    },
    {
      name: 'Reject All Cookies',
      route: '/reject-cookies',
      color: '#3A59D1',
      imageUrl: '/images/cookies.jpg',
    },
    {
      name: 'Country Guesser',
      route: '/country-guesser',
      color: '#809D3C',
      imageUrl: '/images/guessaflag.jpg',
    },
    {
      name: 'Math Comparer',
      route: '/math-comparer',
      color: '#B2A5FF',
      imageUrl: '/images/math.jpg',
    },
    {
      name: 'Color Reaction',
      route: '/color-click',
      color: '#ff6347',
      imageUrl: '/images/reaction.jpg',
    },
    {
      name: 'Months Left',
      route: '/left-to-live',
      color: '#AE445A',
      imageUrl: '/images/months.jpg',
    },
    {
      name: 'Algorithms Graph',
      route: 'https://ruslanpr0g.github.io/algo-graph/',
      color: '#C8AAAA',
      imageUrl: '/images/graphs.jpg',
      isExternal: true,
    },
  ];

  getGames(): GameRoute[] {
    return this.games;
  }
}
