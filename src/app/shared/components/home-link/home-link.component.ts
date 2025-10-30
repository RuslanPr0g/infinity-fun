import { Component } from '@angular/core';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-home-link',
  standalone: true,
  templateUrl: './home-link.component.html',
  styleUrls: ['./home-link.component.scss'],
})
export class HomeLinkComponent {
  releaseVersion = environment.releaseVersion;
}
