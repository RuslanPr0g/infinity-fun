import { Component, OnInit } from '@angular/core';
import { PeriodicTableService } from '../../shared/services/periodic-table/periodic-table.service';
import { PeriodicElement } from '../models/periodic.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeriodicElementDetailComponent } from './details/periodic-element-detail.component';

@Component({
  selector: 'app-periodic-guess',
  standalone: true,
  imports: [CommonModule, FormsModule, PeriodicElementDetailComponent],
  templateUrl: './periodic-guess.component.html',
  styleUrls: ['./periodic-guess.component.scss'],
})
export class PeriodicGuessComponent implements OnInit {
  loading = true;
  elements: PeriodicElement[] = [];
  current?: PeriodicElement;
  guess = '';
  feedback: 'correct' | 'incorrect' | null = null;
  score = 0;
  showDetailModal = false;

  constructor(private svc: PeriodicTableService) {}

  ngOnInit(): void {
    this.svc.getElements().subscribe((list) => {
      this.elements = list;
      this.next();
      this.loading = false;
    });
  }

  next(): void {
    this.feedback = null;
    this.guess = '';
    if (!this.elements.length) return;
    const idx = Math.floor(Math.random() * this.elements.length);
    this.current = this.elements[idx];
  }

  submit(): void {
    if (!this.current) return;
    const expected = (this.current.name || '').trim().toLowerCase();
    if (this.guess.trim().toLowerCase() === expected) {
      this.feedback = 'correct';
      this.score += 1;
      setTimeout(() => this.next(), 900);
    } else {
      this.feedback = 'incorrect';
    }
  }

  openDetailModal(): void {
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
  }
}
