import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  games = [{ name: 'Click the Color', route: '/color-click' }];

  constructor(private router: Router) {}

  navigateToGame(route: string) {
    this.router.navigate([route]);
  }
}
