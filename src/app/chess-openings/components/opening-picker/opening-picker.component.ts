import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocalStorageConst } from '../../../core/constants/local-storage.const';
import { LocalStorageService } from '../../../shared/services/local-storage/local-storage.service';
import { Opening } from '../../models/opening.model';
import { OpeningDisplayService } from '../../services/opening-display.service';
import { OpeningLibraryService } from '../../services/opening-library.service';

type Tab = 'popular' | 'search';

/**
 * Practice-set picker: search across the full dataset or browse a curated
 * "Popular" shortlist, multi-select openings to practice, persisted so the
 * user's picks survive a reload. Search results are always full-dataset;
 * only the quiz/drill pools built from the final selection are ever scoped
 * down, so obscure openings only appear if explicitly picked here.
 */
@Component({
  selector: 'app-opening-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="picker">
      <h1 class="title">Opening Trainer</h1>
      <p class="subtitle">Pick the openings you want to practice.</p>

      <div class="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          class="tab"
          [class.active]="tab() === 'popular'"
          (click)="tab.set('popular')"
        >
          Popular
        </button>
        <button
          type="button"
          role="tab"
          class="tab"
          [class.active]="tab() === 'search'"
          (click)="tab.set('search')"
        >
          Search all ({{ library.openings().length }})
        </button>
      </div>

      @if (tab() === 'search') {
        <input
          class="search-input"
          type="text"
          placeholder="Search by name or ECO code (e.g. 'Sicilian', 'B20')…"
          [ngModel]="searchTerm()"
          (ngModelChange)="searchTerm.set($event)"
        />
      }

      <div class="selected-bar">
        <span class="selected-count">{{ selectedIds().size }} selected</span>
        @if (selectedIds().size > 0) {
          <button type="button" class="clear-button" (click)="clearSelection()">Clear</button>
        }
      </div>

      <ul class="opening-list">
        @for (opening of visibleOpenings(); track opening.id) {
          <li>
            <label class="opening-row" [class.checked]="isSelected(opening.id)">
              <input
                type="checkbox"
                [checked]="isSelected(opening.id)"
                (change)="toggle(opening.id)"
              />
              <span class="eco">{{ opening.eco }}</span>
              <span class="name">{{ formatDisplayName(opening) }}</span>
            </label>
          </li>
        } @empty {
          <li class="empty">
            {{ tab() === 'search' && searchTerm().length === 0
              ? 'Type to search the full dataset.'
              : 'No openings found.' }}
          </li>
        }
      </ul>

      <button
        type="button"
        class="start-button"
        [disabled]="selectedIds().size === 0"
        (click)="onStart()"
      >
        Start practicing ({{ selectedIds().size }})
      </button>
    </div>
  `,
  styleUrl: './opening-picker.component.scss',
})
export class OpeningPickerComponent implements OnInit {
  readonly library = inject(OpeningLibraryService);
  private readonly localStorage = inject(LocalStorageService);
  private readonly displayService = inject(OpeningDisplayService);

  @Output() start = new EventEmitter<Opening[]>();

  readonly tab = signal<Tab>('popular');
  readonly searchTerm = signal('');
  readonly selectedIds = signal<Set<string>>(new Set());

  readonly visibleOpenings = computed<Opening[]>(() => {
    if (this.tab() === 'popular') return this.library.popular();
    return this.library.search(this.searchTerm()).slice(0, 100);
  });

  formatDisplayName(opening: Opening): string {
    return this.displayService.formatDisplayName(opening, this.library.openings());
  }

  async ngOnInit(): Promise<void> {
    await this.library.ensureLoaded();
    const savedIds =
      this.localStorage.getItem<string[]>(LocalStorageConst.OpeningTrainerPracticeSet) ?? [];
    this.selectedIds.set(new Set(savedIds));
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggle(id: string): void {
    const next = new Set(this.selectedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedIds.set(next);
    this.persist();
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
    this.persist();
  }

  onStart(): void {
    const ids = this.selectedIds();
    const chosen = this.library.openings().filter((opening) => ids.has(opening.id));
    if (chosen.length === 0) return;
    this.start.emit(chosen);
  }

  private persist(): void {
    this.localStorage.setItem(
      LocalStorageConst.OpeningTrainerPracticeSet,
      [...this.selectedIds()],
    );
  }
}
