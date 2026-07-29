import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocalStorageConst } from '../../../core/constants/local-storage.const';
import { LocalStorageService } from '../../../shared/services/local-storage/local-storage.service';
import { Opening } from '../../models/opening.model';
import { OpeningDisplayService } from '../../services/opening-display.service';
import { OpeningLibraryService } from '../../services/opening-library.service';
import { OpeningPreviewComponent } from '../opening-preview/opening-preview.component';

type Tab = 'popular' | 'search';

/** A hovered opening plus the viewport coords its preview should render at. */
interface PreviewAnchor {
  readonly opening: Opening;
  readonly left: number;
  /**
   * Exactly one of these is set, the other null. Anchoring to a single edge
   * lets the popup grow inward, which keeps it on screen at any height.
   */
  readonly top: number | null;
  readonly bottom: number | null;
}

/** Must match .preview-popup's width in opening-preview.component.scss. */
const PREVIEW_WIDTH = 186;
const PREVIEW_GAP = 12;
const VIEWPORT_MARGIN = 8;

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
  imports: [CommonModule, FormsModule, OpeningPreviewComponent],
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

      <ul class="opening-list" (scroll)="hidePreview()">
        @for (opening of visibleOpenings(); track opening.id) {
          <li
            class="opening-item"
            (mouseenter)="showPreview(opening, $event)"
            (mouseleave)="hidePreview()"
          >
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

      <!--
        Rendered outside .opening-list on purpose: that list is a scroll
        container, which clips both axes, so an absolutely positioned preview
        inside it would be cut off. Fixed positioning against the hovered
        row's viewport rect escapes the clip entirely.
      -->
      @if (preview(); as p) {
        <div
          class="preview-container"
          [style.left.px]="p.left"
          [style.top.px]="p.top"
          [style.bottom.px]="p.bottom"
        >
          <app-opening-preview [opening]="p.opening" [name]="formatDisplayName(p.opening)" />
        </div>
      }

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
  readonly preview = signal<PreviewAnchor | null>(null);

  readonly visibleOpenings = computed<Opening[]>(() => {
    if (this.tab() === 'popular') return this.library.popular();
    return this.library.search(this.searchTerm()).slice(0, 100);
  });

  /**
   * Pointer-based preview is desktop-only for now: a tap on a touch screen
   * still synthesises mouseenter, which would leave the box stuck on screen
   * with no matching mouseleave.
   */
  private get isPointerDevice(): boolean {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  showPreview(opening: Opening, event: MouseEvent): void {
    if (!this.isPointerDevice) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();

    // Prefer the right of the row; flip left when that would overflow.
    let left = rect.right + PREVIEW_GAP;
    if (left + PREVIEW_WIDTH > window.innerWidth - VIEWPORT_MARGIN) {
      left = rect.left - PREVIEW_WIDTH - PREVIEW_GAP;
    }

    // Height varies with the opening's name and move list, so centring on the
    // row and clamping against an assumed height overflows the tall ones.
    // Anchor to whichever edge the row is nearer and let it grow inward.
    const inUpperHalf = rect.top + rect.height / 2 < window.innerHeight / 2;

    this.preview.set({
      opening,
      left: Math.max(VIEWPORT_MARGIN, left),
      top: inUpperHalf ? Math.max(VIEWPORT_MARGIN, rect.top) : null,
      bottom: inUpperHalf
        ? null
        : Math.max(VIEWPORT_MARGIN, window.innerHeight - rect.bottom),
    });
  }

  hidePreview(): void {
    this.preview.set(null);
  }

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
