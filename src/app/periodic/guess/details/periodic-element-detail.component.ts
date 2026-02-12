import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PeriodicElement } from '../../models/periodic.model';

@Component({
  selector: 'app-periodic-element-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './periodic-element-detail.component.html',
  styleUrls: ['./periodic-element-detail.component.scss'],
})
export class PeriodicElementDetailComponent {
  @Input() element?: PeriodicElement;
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  hideName = true;

  toggleHideName(): void {
    this.hideName = !this.hideName;
  }

  onClose(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  maskName(text?: string | null): string {
    if (!text || !this.element?.name || !this.hideName) {
      return text || '';
    }
    const regex = new RegExp(this.element.name, 'gi');
    return text.replace(regex, '***');
  }

  getWikipediaLink(): string {
    if (!this.element?.name) return '';
    return `https://en.wikipedia.org/wiki/${this.element.name}`;
  }
}
