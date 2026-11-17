import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { GameRouteService } from '../../shared/services/game-route/game-route.service';

export const SITE_NAME = 'Infinity Fun';

/** Tab title for every navigation: "<Game> · Infinity Fun" on a game, "Infinity Fun" everywhere else. */
@Injectable({ providedIn: 'root' })
export class GameTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly games = inject(GameRouteService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    let route = snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    const game = this.games.byRoute('/' + (route.routeConfig?.path ?? ''));
    this.title.setTitle(game ? `${game.name} · ${SITE_NAME}` : SITE_NAME);
  }
}
