import { Component } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { HomeLinkComponent } from './shared/components/home-link/home-link.component';
import { CommonModule } from '@angular/common';
import { SpaceBackgroundComponent } from './space-background/space-background.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HomeLinkComponent,
    SpaceBackgroundComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title: string = 'infinityfun';

  constructor(protected route: ActivatedRoute) {}
}
