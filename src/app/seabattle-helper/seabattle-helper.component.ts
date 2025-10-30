import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

type CellState = 'empty' | 'miss' | 'hit' | 'kill';

interface Cell {
  state: CellState;
}

@Component({
  selector: 'app-seabattle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './seabattle-helper.component.html',
  styleUrls: ['./seabattle-helper.component.scss'],
})
export class SeaBattleHelperGameComponent implements OnInit {
  readonly size = 10;
  grid: Cell[][] = [];
  probabilityMatrix: number[][] = [];
  readonly ships = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];

  ngOnInit() {
    this.resetGrid();
    this.updateProbabilities();
  }

  resetGrid() {
    this.grid = Array.from({ length: this.size }, () =>
      Array.from({ length: this.size }, () => ({ state: 'empty' as CellState }))
    );
    this.clearProbabilities();
  }

  clearProbabilities() {
    this.probabilityMatrix = Array.from({ length: this.size }, () =>
      Array(this.size).fill(0)
    );
  }

  onCellClick(x: number, y: number) {
    const order: CellState[] = ['empty', 'miss', 'hit', 'kill'];
    const cell = this.grid[y][x];
    const next = order[(order.indexOf(cell.state) + 1) % order.length];
    cell.state = next;

    this.recalculateMissesAroundKills([x, y]);
    this.updateProbabilities();

    this.grid = [...this.grid];
  }

  recalculateMissesAroundKills(skip?: [number, number]) {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.grid[y][x].state === 'miss') {
          if (!skip || x !== skip[0] || y !== skip[1]) {
            this.grid[y][x].state = 'empty';
          }
        }
      }
    }

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.grid[y][x].state === 'kill') {
          this.markSurroundingMiss(x, y);
        }
      }
    }
  }

  markSurroundingMiss(x: number, y: number) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (
          nx >= 0 &&
          ny >= 0 &&
          nx < this.size &&
          ny < this.size &&
          this.grid[ny][nx].state === 'empty'
        ) {
          this.grid[ny][nx].state = 'miss';
        }
      }
    }
  }

  updateProbabilities() {
    this.clearProbabilities();
    const hits = this.getHitCoords();

    for (const shipSize of this.ships) {
      // horizontal
      for (let y = 0; y < this.size; y++) {
        for (let x = 0; x <= this.size - shipSize; x++) {
          if (this.canPlaceShip(x, y, shipSize, true, hits)) {
            for (let i = 0; i < shipSize; i++)
              this.probabilityMatrix[y][x + i]++;
          }
        }
      }
      // vertical
      for (let y = 0; y <= this.size - shipSize; y++) {
        for (let x = 0; x < this.size; x++) {
          if (this.canPlaceShip(x, y, shipSize, false, hits)) {
            for (let i = 0; i < shipSize; i++)
              this.probabilityMatrix[y + i][x]++;
          }
        }
      }
    }
  }

  canPlaceShip(
    x: number,
    y: number,
    shipSize: number,
    horizontal: boolean,
    hits: [number, number][]
  ): boolean {
    for (let i = 0; i < shipSize; i++) {
      const cx = horizontal ? x + i : x;
      const cy = horizontal ? y : y + i;

      if (cx >= this.size || cy >= this.size) return false;
      const state = this.grid[cy][cx].state;
      if (state === 'miss' || state === 'kill') return false;
    }

    if (hits.length > 0) {
      const coversAllHits = hits.every(([hx, hy]) =>
        horizontal
          ? hy === y && hx >= x && hx < x + shipSize
          : hx === x && hy >= y && hy < y + shipSize
      );
      if (!coversAllHits) return false;
    }

    return true;
  }

  getHitCoords(): [number, number][] {
    const hits: [number, number][] = [];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.grid[y][x].state === 'hit') hits.push([x, y]);
      }
    }
    return hits;
  }
}
