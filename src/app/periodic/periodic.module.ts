import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeriodicGameComponent } from './periodic-game.component';
import { PeriodicGuessComponent } from './guess/periodic-guess.component';

@NgModule({
  declarations: [PeriodicGameComponent, PeriodicGuessComponent],
  imports: [CommonModule, FormsModule],
  exports: [PeriodicGameComponent],
})
export class PeriodicModule {}
