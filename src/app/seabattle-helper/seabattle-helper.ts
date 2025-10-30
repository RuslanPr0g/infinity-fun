import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DirectiveModule } from '../shared/directives/directive.module';

@Component({
  selector: 'app-seabattle',
  standalone: true,
  imports: [CommonModule, DirectiveModule],
  templateUrl: './seabattle-helper.html',
  styleUrls: ['./seabattle-helper.scss'],
})
export class SeaBattleHelperGameComponent {}
