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

  constructor(private router: Router, private gameService: GameRouteService) {}

  ngOnInit() {
    this.games = this.gameService.getGames();
  }

  navigateToGame(route: string) {
    this.router.navigate([route]);
  }
}
