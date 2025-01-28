import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { worldCountries } from './data/worldCountries';
import { Country } from './models/country.model';

@Component({
  selector: 'app-country-guesser',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './country-guesser.component.html',
  styleUrls: ['./country-guesser.component.scss'],
})
export class CountryGuesserGameComponent implements OnInit {
  countries: Country[] = worldCountries;
  currentCountry?: Country;
  userGuess: string = '';
  guessStatus: 'success' | 'fail' | 'no guess' | null = null;

  ngOnInit(): void {
    this.loadRandomCountry();
  }

  onEnterKey(): void {
    this.checkAnswer();
  }

  checkAnswer(): void {
    if (!this.userGuess.trim() || !!this.guessStatus) {
      return;
    }

    const isCorrect = this.isGuessCorrect();
    this.guessStatus = isCorrect ? 'success' : 'fail';

    if (isCorrect) {
      this.resetGame();
      return;
    }

    setTimeout(() => {
      this.resetStatus();
    }, 1500);
  }

  isGuessCorrect(): boolean {
    return (
      this.userGuess.trim().toLowerCase() ===
      this.currentCountry?.name?.toLowerCase()
    );
  }

  loadRandomCountry(): void {
    const randomIndex = Math.floor(Math.random() * this.countries.length);
    this.currentCountry = this.countries[randomIndex];
  }

  private resetGame(): void {
    setTimeout(() => {
      this.loadRandomCountry();
      this.userGuess = '';
      this.resetStatus();
    }, 1500);
  }

  private resetStatus(): void {
    this.guessStatus = null;
  }
}
