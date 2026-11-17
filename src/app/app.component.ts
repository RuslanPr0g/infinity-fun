import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Just the router. Home brings its own header; every game brings <app-game-shell>. */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent {}
