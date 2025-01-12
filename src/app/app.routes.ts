import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ClickColorGameComponent } from './click-color/click-color.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'color-click', component: ClickColorGameComponent },
  { path: '**', redirectTo: '' },
];
