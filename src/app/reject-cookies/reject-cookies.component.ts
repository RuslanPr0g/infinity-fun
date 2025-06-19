import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { RejectCookiesWebSiteComponent } from './reject-cookies-website/reject-cookies-website.component';

@Component({
  selector: 'app-reject-cookies',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RejectCookiesWebSiteComponent],
  templateUrl: './reject-cookies.component.html',
  styleUrl: './reject-cookies.component.scss',
})
export class RejectCookiesGameComponent {
  form = new FormGroup({
    age: new FormControl(18),
    liveto: new FormControl(70),
  });

  constructor() { }

  ngOnInit(): void {
  }
}
