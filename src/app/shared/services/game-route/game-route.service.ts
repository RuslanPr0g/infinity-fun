import { Injectable } from '@angular/core';
import { GameRoute } from '../../../core/models/game-route.model';

@Injectable({
  providedIn: 'root',
})
export class GameRouteService {
  private games: GameRoute[] = [
    { name: 'Color Reaction', route: '/color-click' },
  ];

  getGames(): GameRoute[] {
    return this.games;
  }
}
