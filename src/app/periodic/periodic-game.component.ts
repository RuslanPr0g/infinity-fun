import { Component } from '@angular/core';
import { PeriodicGuessComponent } from './guess/periodic-guess.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-periodic-game',
  standalone: true,
  imports: [CommonModule, PeriodicGuessComponent],
  templateUrl: './periodic-game.component.html',
  styleUrls: ['./periodic-game.component.scss'],
})
export class PeriodicGameComponent {}
