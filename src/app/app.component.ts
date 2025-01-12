import { Component } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { HomeLinkComponent } from './shared/components/home-link/home-link.component';
import { CommonModule } from '@angular/common';
import { routeTransition } from './route-transition';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HomeLinkComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  animations: [routeTransition],
})
export class AppComponent {
  title: string = 'infinityfun';

  constructor(protected route: ActivatedRoute) {}
}
