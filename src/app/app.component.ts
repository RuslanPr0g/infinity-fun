import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { HomeLinkComponent } from './shared/components/home-link/home-link.component';
import { CommonModule } from '@angular/common';
import { SpaceBackgroundComponent } from './space-background/space-background.component';
import { ScrollService } from './shared/services/scroll/scroll.service';

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
export class AppComponent implements OnInit {
  constructor(
    protected route: ActivatedRoute,
    private scroll: ScrollService,
  ) {}

  ngOnInit(): void {
    this.scroll.initMobileScrollOnAction();
  }
}
