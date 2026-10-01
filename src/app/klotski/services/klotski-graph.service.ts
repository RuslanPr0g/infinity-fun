import { inject, Injectable } from '@angular/core';
import {
  GraphLayout,
  Move,
  Piece,
  StateGraph,
} from '../models/klotski.models';
import { KlotskiEngine } from './klotski-engine.service';

const Z_HEIGHT = 1.1;

@Injectable({ providedIn: 'root' })
export class KlotskiGraphService {
  private readonly engine = inject(KlotskiEngine);

  /** Breadth-first crawl of every position reachable from `startKey`. */
  buildStateSpace(startKey: string): StateGraph {
    const keys: string[] = [startKey];
    const index = new Map<string, number>([[startKey, 0]]);
    const adj: number[][] = [[]];
    let edgeCount = 0;

    for (let i = 0; i < keys.length; i++) {
      const board = this.engine.boardFromKey(keys[i]);
      for (const move of this.engine.successors(board)) {
        let j = index.get(move.key);
        if (j === undefined) {
          j = keys.length;
          keys.push(move.key);
          index.set(move.key, j);
          adj.push([]);
        }
        if (!adj[i].includes(j)) {
          adj[i].push(j);
          edgeCount++;
        }
      }
    }

    const goals: number[] = [];
    keys.forEach((k, i) => {
      if (this.engine.isSolvedKey(k)) goals.push(i);
    });

    const goalDist = new Int32Array(keys.length).fill(-1);
    const queue: number[] = [];
    for (const g of goals) {
      goalDist[g] = 0;
      queue.push(g);
    }
    let maxGoalDist = 0;
    for (let head = 0; head < queue.length; head++) {
      const u = queue[head];
      for (const v of adj[u]) {
        if (goalDist[v] >= 0) continue;
        goalDist[v] = goalDist[u] + 1;
        maxGoalDist = Math.max(maxGoalDist, goalDist[v]);
        queue.push(v);
      }
    }

    return { keys, index, adj, goalDist, maxGoalDist, goals, edgeCount: edgeCount / 2 };
  }

  /** First position (in discovery order) that is exactly `distance` moves from solved. */
  findAtGoalDistance(graph: StateGraph, distance: number): string | null {
    const i = graph.goalDist.indexOf(distance);
    return i < 0 ? null : graph.keys[i];
  }

  /**
   * Radial tree layout rooted at `root`: ring = moves from the root, angle =
   * proportional share of the BFS tree's leaves. Height = moves to goal.
   */
  layout(graph: StateGraph, root: number): GraphLayout {
    const n = graph.keys.length;
    const parent = new Int32Array(n).fill(-1);
    const depth = new Int32Array(n).fill(-1);
    const children: number[][] = Array.from({ length: n }, () => []);
    const order: number[] = [root];
    depth[root] = 0;

    let maxDepth = 0;
    for (let head = 0; head < order.length; head++) {
      const u = order[head];
      for (const v of graph.adj[u]) {
        if (depth[v] >= 0) continue;
        depth[v] = depth[u] + 1;
        maxDepth = Math.max(maxDepth, depth[v]);
        parent[v] = u;
        children[u].push(v);
        order.push(v);
      }
    }

    const leaves = new Float64Array(n);
    for (let k = order.length - 1; k >= 0; k--) {
      const u = order[k];
      if (leaves[u] === 0) leaves[u] = 1;
      if (parent[u] >= 0) leaves[parent[u]] += leaves[u];
    }

    const lo = new Float64Array(n);
    const hi = new Float64Array(n);
    hi[root] = Math.PI * 2;
    const x = new Float32Array(n);
    const y = new Float32Array(n);
    const z = new Float32Array(n);
    const span = Math.max(1, maxDepth);
    const zSpan = Math.max(1, graph.maxGoalDist);

    for (const u of order) {
      let cursor = lo[u];
      for (const c of children[u]) {
        const width = ((hi[u] - lo[u]) * leaves[c]) / leaves[u];
        lo[c] = cursor;
        hi[c] = cursor + width;
        cursor += width;
      }
      const angle = (lo[u] + hi[u]) / 2;
      const r = depth[u] / span;
      x[u] = r * Math.cos(angle);
      y[u] = r * Math.sin(angle);
      z[u] = (Math.max(0, graph.goalDist[u]) / zSpan) * Z_HEIGHT;
    }

    return { root, x, y, z, depth, parent, maxDepth };
  }

  /** A move that gets one step closer to solved, or null when already solved. */
  bestMove(graph: StateGraph, board: readonly Piece[]): Move | null {
    const here = graph.index.get(this.engine.keyOf(board));
    if (here === undefined || graph.goalDist[here] <= 0) return null;
    for (const m of this.engine.successors(board)) {
      const j = graph.index.get(m.key);
      if (j !== undefined && graph.goalDist[j] === graph.goalDist[here] - 1) {
        return { pieceId: m.pieceId, row: m.row, col: m.col };
      }
    }
    return null;
  }
}
