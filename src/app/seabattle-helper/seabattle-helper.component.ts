import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

type CellState = 'empty' | 'miss' | 'hit' | 'kill';

interface Cell {
  state: CellState;
  autoMiss?: boolean;
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

  readonly letters = Array.from({ length: this.size }, (_, i) =>
    String.fromCharCode(65 + i)
  );
  readonly numbers = Array.from({ length: this.size }, (_, i) => i + 1);

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
    const cell = this.grid[y][x];

    if (!this.canClickCell(x, y)) return;

    if (cell.state === 'kill') {
      this.clearKilledShip(x, y);
    } else {
      const order: CellState[] = ['empty', 'miss', 'hit', 'kill'];
      const next = order[(order.indexOf(cell.state) + 1) % order.length];
      cell.state = next;
      if (next === 'kill') this.propagateKill(x, y);
      if (next === 'empty') this.recalculateMissesAroundKills();
    }

    this.updateProbabilities();
    this.grid = [...this.grid];
  }

  canClickCell(x: number, y: number) {
    const hits = this.getHitCoords();
    if (hits.length === 0) return true;

    const cell = this.grid[y][x];
    if (cell.state === 'hit' || cell.state === 'kill') return true;

    return hits.some(([hx, hy]) => Math.abs(hx - x) + Math.abs(hy - y) === 1);
  }

  propagateKill(x: number, y: number) {
    const queue: [number, number][] = [[x, y]];
    const visited = new Set<string>();

    while (queue.length) {
      const [cx, cy] = queue.shift()!;
      const key = `${cx},${cy}`;
      if (visited.has(key)) continue;
      visited.add(key);

      this.grid[cy][cx].state = 'kill';
      this.markSurroundingMiss(cx, cy);

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (
            nx >= 0 &&
            ny >= 0 &&
            nx < this.size &&
            ny < this.size &&
            this.grid[ny][nx].state === 'hit'
          ) {
            queue.push([nx, ny]);
          }
        }
      }
    }
  }

  clearKilledShip(x: number, y: number) {
    const shipCells: [number, number][] = [];
    const visited = new Set<string>();
    const queue: [number, number][] = [[x, y]];

    while (queue.length) {
      const [cx, cy] = queue.shift()!;
      const key = `${cx},${cy}`;
      if (visited.has(key)) continue;
      visited.add(key);

      if (this.grid[cy][cx].state === 'kill') {
        shipCells.push([cx, cy]);
        const dirs: [number, number][] = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ];
        for (const [dx, dy] of dirs) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (
            nx >= 0 &&
            ny >= 0 &&
            nx < this.size &&
            ny < this.size &&
            this.grid[ny][nx].state === 'kill'
          ) {
            queue.push([nx, ny]);
          }
        }
      }
    }

    for (const [cx, cy] of shipCells) {
      this.grid[cy][cx].state = 'empty';
    }

    // Clear surrounding auto-misses
    for (const [cx, cy] of shipCells) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (
            nx >= 0 &&
            ny >= 0 &&
            nx < this.size &&
            ny < this.size &&
            this.grid[ny][nx].autoMiss
          ) {
            this.grid[ny][nx].state = 'empty';
            delete this.grid[ny][nx].autoMiss;
          }
        }
      }
    }
  }

  recalculateMissesAroundKills() {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.grid[y][x].state === 'miss') {
          this.grid[y][x].state = 'empty';
          delete this.grid[y][x].autoMiss;
        }
      }
    }

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.grid[y][x].state === 'kill') this.markSurroundingMiss(x, y);
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
          this.grid[ny][nx].autoMiss = true;
        }
      }
    }
  }

  updateProbabilities() {
    this.clearProbabilities();
    const hits = this.getHitCoords();

    for (const shipSize of this.ships) {
      for (let y = 0; y < this.size; y++) {
        for (let x = 0; x <= this.size - shipSize; x++) {
          if (this.canPlaceShip(x, y, shipSize, true, hits)) {
            for (let i = 0; i < shipSize; i++)
              this.probabilityMatrix[y][x + i]++;
          }
        }
      }
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

  getCellColor(x: number, y: number): string {
    const cell = this.grid[y][x];
    if (cell.state === 'hit') return '#ff9800';
    if (cell.state === 'kill') return '#e53935';
    if (cell.state === 'miss') return '#546e7a';
    if (cell.state === 'empty') {
      const max = this.getMaxProbability();
      const value = this.probabilityMatrix[y][x];
      if (max === 0 || value === 0) return '#003366';
      const intensity = Math.round((value / max) * 255);
      return `rgb(${intensity},0,${255 - intensity})`;
    }
    return '#003366';
  }

  getMaxProbability(): number {
    let max = 0;
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.probabilityMatrix[y][x] > max)
          max = this.probabilityMatrix[y][x];
      }
    }
    return max;
  }
}
