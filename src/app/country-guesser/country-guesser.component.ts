import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-country-guesser',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './country-guesser.component.html',
  styleUrls: ['./country-guesser.component.scss'],
})
export class CountryGuesserGameComponent {
  countries = ['ua', 'us', 'de', 'fr', 'gb'];
  currentFlag: string =
    this.countries[Math.floor(Math.random() * this.countries.length)];
  userGuess: string = '';
  resultMessage: string = '';

  checkAnswer() {
    if (this.userGuess.toLowerCase() === this.currentFlag) {
      this.resultMessage = 'Correct! 🎉';
    } else {
      this.resultMessage = 'Oops, try again! 😅';
    }

    setTimeout(() => {
      this.currentFlag =
        this.countries[Math.floor(Math.random() * this.countries.length)];
      this.userGuess = '';
      this.resultMessage = '';
    }, 1500);
  }
}
