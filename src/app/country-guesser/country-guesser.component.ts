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
  resultMessage: string = '';

  ngOnInit(): void {
    this.loadRandomCountry();
  }

  onEnterKey(): void {
    this.checkAnswer();
  }

  checkAnswer(): void {
    if (!this.userGuess.trim()) {
      this.resultMessage = 'Please enter a country name. 🙄';
      return;
    }

    const isCorrect = this.isGuessCorrect();
    this.resultMessage = isCorrect ? 'Correct! 🎉' : 'Oops, try again! 😅';

    if (isCorrect) {
      this.resetGame();
    }
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
      this.resultMessage = '';
    }, 1500);
  }
}
