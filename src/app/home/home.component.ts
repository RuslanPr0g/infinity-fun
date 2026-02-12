import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GameRouteService } from '../shared/services/game-route/game-route.service';
import { CommonModule } from '@angular/common';
import { GameRoute } from '../core/models/game-route.model';
import { DirectiveModule } from '../shared/directives/directive.module';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, DirectiveModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  games: GameRoute[] = [];

  constructor(
    private router: Router,
    private gameService: GameRouteService,
  ) {}

  ngOnInit() {
    this.games = this.gameService.getGames();
  }

  ngAfterViewInit() {
    const video = document.getElementById(
      'background-video',
    ) as HTMLVideoElement;
    if (video) {
      video.playbackRate = 0.1;
      video.volume = 0;
    }
  }

  navigateToGame(game: GameRoute) {
    if (game.isExternal) {
      window.open(game.route, '_blank');
      return;
    }

    this.router.navigate([game.route]);
  }
}
