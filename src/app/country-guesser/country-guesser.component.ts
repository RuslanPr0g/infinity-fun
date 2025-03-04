import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { worldCountries } from './data/worldCountries';
import { similarCountryFlags } from './data/similarCountryFlags';
import { Country } from './models/country.model';
import { CountryCode } from './models/country-code.model';
import { SoundService } from '../shared/services/sound/sound.service';
import { LocalStorageService } from '../shared/services/local-storage/local-storage.service';
import { LocalStorageConst } from '../core/constants/local-storage.const';

@Component({
  selector: 'app-country-guesser',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './country-guesser.component.html',
  styleUrls: ['./country-guesser.component.scss'],
})
export class CountryGuesserGameComponent implements OnInit {
  countries: Country[] = [
    ...new Map(worldCountries.map((item) => [item.code, item])).values(),
  ];
  currentCountry?: Country;
  userGuess: string = '';
  guessStatus: 'success' | 'fail' | 'no guess' | null = null;
  isMultipleChoiceMode: boolean = true;
  isInsaneMode: boolean = false;
  countryOptions: Country[] = [];

  streak: number = 0;
  maxStreak: number = 0;
  private readonly streakKey = LocalStorageConst.CountryGuesserStreak;
  private readonly maxStreakKey = LocalStorageConst.CountryGuesserMaxStreak;
  private readonly countryKey = LocalStorageConst.CountryGuesserCountry;

  constructor(
    private soundService: SoundService,
    private localStorageService: LocalStorageService
  ) {}

  ngOnInit(): void {
    const storedStreak = this.localStorageService.getItem<number>(
      this.streakKey
    );
    this.streak = storedStreak !== null ? storedStreak : 0;

    const storedMaxStreak = this.localStorageService.getItem<number>(
      this.maxStreakKey
    );
    this.maxStreak = storedMaxStreak !== null ? storedMaxStreak : this.streak;

    const storedCountry = this.localStorageService.getItem<string>(
      this.countryKey
    );
    this.loadCountry(storedCountry);
  }

  onModeChange(): void {
    this.loadCountry();
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
      this.resetCountryToGuess();
      return;
    }

    this.fail();
  }

  isGuessCorrect(): boolean {
    return (
      this.userGuess.trim().toLowerCase() ===
      this.currentCountry?.name?.toLowerCase()
    );
  }

  loadCountry(countryCode?: string | null): void {
    const defaultCountry = this.countries.find((c) => c.code === countryCode);

    if (defaultCountry) {
      this.currentCountry = defaultCountry;
    } else {
      const randomIndex = Math.floor(Math.random() * this.countries.length);
      this.currentCountry = this.countries[randomIndex];
    }

    if (this.isMultipleChoiceMode) {
      this.loadMultipleChoiceOptions();
    }

    this.localStorageService.setItem(this.countryKey, this.currentCountry.code);
  }

  loadMultipleChoiceOptions(): void {
    const shuffledCountries = [...this.countries];
    this.countryOptions = [this.currentCountry!];

    const similarCountries = this.getSimilarCountries(
      this.currentCountry!.code
    );

    if (similarCountries) {
      this.countryOptions = [
        ...this.countryOptions,
        ...this.countries.filter((x) => similarCountries.includes(x.code)),
      ];
    }

    if (
      this.currentCountry?.name.includes(' ') ||
      this.currentCountry?.name.includes('-')
    ) {
      const countriesWithSpaceOrDash = this.countries.filter(
        (country) => country.name.includes(' ') || country.name.includes('-')
      );
      this.countryOptions = [
        ...this.countryOptions,
        ...countriesWithSpaceOrDash
          .filter((country) => country.name !== this.currentCountry?.name)
          .slice(0, 2),
      ];
    }

    const availableCountries = shuffledCountries.filter(
      (country) => !this.countryOptions.includes(country)
    );

    while (this.countryOptions.length < 5 && availableCountries.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableCountries.length);
      const country = availableCountries[randomIndex];

      this.countryOptions.push(country);
      availableCountries.splice(randomIndex, 1);
    }

    this.countryOptions = this.shuffleArray(this.countryOptions.slice(0, 5));
  }

  getSimilarCountries(countryCode: CountryCode): CountryCode[] {
    const similarCountries = similarCountryFlags.find((group) =>
      group.includes(countryCode)
    );
    return similarCountries
      ? similarCountries.filter((code) => code !== countryCode)
      : [];
  }

  shuffleArray(arr: Country[]): Country[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  checkMultipleChoiceAnswer(country: Country): void {
    if (!!this.guessStatus) {
      return;
    }

    const isCorrect = country.name === this.currentCountry?.name;
    this.guessStatus = isCorrect ? 'success' : 'fail';

    if (isCorrect) {
      this.resetCountryToGuess();
      return;
    }

    this.fail();
  }

  private resetCountryToGuess(): void {
    this.soundService.playCorrect();
    this.updateStreak(this.streak + 1);
    setTimeout(() => {
      this.loadCountry();
      this.userGuess = '';
      this.resetStatus();
    }, 1000);
  }

  private resetStatus(): void {
    this.guessStatus = null;
  }

  private fail(): void {
    this.soundService.playWrong();
    this.updateStreak(0);
    setTimeout(() => {
      this.resetStatus();
    }, 1000);
  }

  private updateStreak(newValue: number): void {
    if (newValue > this.maxStreak) {
      this.maxStreak = newValue;
      this.localStorageService.setItem(this.maxStreakKey, this.maxStreak);
    }

    this.streak = newValue;
    this.localStorageService.setItem(this.streakKey, this.streak);
  }
}
