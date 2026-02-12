import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  OnChanges,
  SimpleChanges,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeriodicElement } from '../../models/periodic.model';

@Component({
  selector: 'app-periodic-element-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './periodic-element-detail.component.html',
  styleUrls: ['./periodic-element-detail.component.scss'],
})
export class PeriodicElementDetailComponent implements OnInit {
  @Input() element?: PeriodicElement;
  @Input() isOpen = false;
  @Input() elements: PeriodicElement[] = [];
  @Output() close = new EventEmitter<void>();

  hideName = true;
  searchQuery = '';
  filteredElements: PeriodicElement[] = [];
  showSearchResults = false;
  originalElement?: PeriodicElement;

  ngOnInit(): void {
    this.originalElement = this.element;
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.isOpen) {
      this.onClose();
    }
  }

  toggleHideName(): void {
    this.hideName = !this.hideName;
  }

  onClose(): void {
    this.originalElement && this.selectElement(this.originalElement);
    this.hideName = true;
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

  getWikipediaLink(): string | undefined {
    return this.element?.source;
  }

  onSearchChange(eventTarget: EventTarget | null): void {
    const query = (eventTarget as HTMLInputElement)?.value || '';
    this.searchQuery = query;
    if (query.trim().length === 0) {
      this.showSearchResults = false;
      return;
    }
    const q = query.toLowerCase();
    this.filteredElements = this.elements.filter(
      (el) =>
        el.name.toLowerCase().includes(q) ||
        el.symbol.toLowerCase().includes(q),
    );
    this.showSearchResults = true;
  }

  selectElement(el: PeriodicElement): void {
    this.element = el;
    this.searchQuery = '';
    this.showSearchResults = false;
    this.hideName = false;
  }
}
