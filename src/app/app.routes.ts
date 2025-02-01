import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ClickColorGameComponent } from './click-color/click-color.component';
import { CountryGuesserGameComponent } from './country-guesser/country-guesser.component';
import { MathComparerComponent } from './math-comparer/math-comparer.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'color-click', component: ClickColorGameComponent },
  { path: 'country-guesser', component: CountryGuesserGameComponent },
  { path: 'math-comparer', component: MathComparerComponent },
  { path: '**', redirectTo: '' },
];
