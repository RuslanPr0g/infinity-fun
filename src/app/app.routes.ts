import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ClickColorGameComponent } from './click-color/click-color.component';
import { CountryGuesserGameComponent } from './country-guesser/country-guesser.component';
import { MathComparerGameComponent } from './math-comparer/math-comparer.component';
import { LeftToLiveGameComponent } from './left-to-live/left-to-live.component';
import { RejectCookiesGameComponent } from './reject-cookies/reject-cookies.component';
import { SeaBattleHelperGameComponent } from './seabattle-helper/seabattle-helper';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'color-click', component: ClickColorGameComponent },
  { path: 'country-guesser', component: CountryGuesserGameComponent },
  { path: 'math-comparer', component: MathComparerGameComponent },
  { path: 'left-to-live', component: LeftToLiveGameComponent },
  { path: 'reject-cookies', component: RejectCookiesGameComponent },
  { path: 'seabattle', component: SeaBattleHelperGameComponent },
  { path: '**', redirectTo: '' },
];
