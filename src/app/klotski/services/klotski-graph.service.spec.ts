import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import { GraphLayout, StateGraph } from '../models/klotski.models';
import { CLASSIC_KEY, KlotskiEngine } from './klotski-engine.service';
import { KlotskiGraphService } from './klotski-graph.service';

describe('KlotskiGraphService', () => {
  let engine: KlotskiEngine;
  let service: KlotskiGraphService;
  let graph: StateGraph;
  let layout: GraphLayout;

  // The crawl visits ~26k positions; do it once for the whole suite.
  beforeAll(() => {
    TestBed.configureTestingModule({});
    engine = TestBed.inject(KlotskiEngine);
    service = TestBed.inject(KlotskiGraphService);
    graph = service.buildStateSpace(CLASSIC_KEY);
    layout = service.layout(graph, 0);
  });

  it('finds the well-known 25,955 reachable positions', () => {
    expect(graph.keys.length).toBe(25955);
  });

  it('solves the classic layout in the known optimum of 81 moves', () => {
    expect(graph.goalDist[0]).toBe(81);
  });

  it('reaches every position from the goal (graph is connected)', () => {
    expect(graph.goalDist.every((d) => d >= 0)).toBeTrue();
    expect(graph.goals.every((g) => engine.isSolvedKey(graph.keys[g]))).toBeTrue();
  });

  // Feature: klotski, Property 4: adjacent positions differ by at most one in distance-to-goal
  it('goalDist changes by at most 1 along any edge, and edges are symmetric', () => {
    fc.assert(
      fc.property(fc.nat({ max: graph.keys.length - 1 }), (u) => {
        for (const v of graph.adj[u]) {
          expect(Math.abs(graph.goalDist[u] - graph.goalDist[v])).toBeLessThanOrEqual(1);
          expect(graph.adj[v]).toContain(u);
        }
      }),
      { numRuns: 300 },
    );
  });

  // Feature: klotski, Property 5: following bestMove from anywhere reaches the goal in exactly goalDist moves
  it('bestMove walks a shortest path to the solution', () => {
    fc.assert(
      fc.property(fc.nat({ max: graph.keys.length - 1 }), (start) => {
        let board = engine.boardFromKey(graph.keys[start]);
        let steps = 0;
        for (;;) {
          const m = service.bestMove(graph, board);
          if (!m) break;
          board = engine.move(board, m.pieceId, m.row, m.col);
          steps++;
        }
        expect(engine.isSolved(board)).toBeTrue();
        expect(steps).toBe(graph.goalDist[start]);
      }),
      { numRuns: 15 },
    );
  });

  it('lays every node out inside the unit disc, with the root at the centre', () => {
    expect(layout.x[0]).toBe(0);
    expect(layout.y[0]).toBe(0);
    for (let i = 0; i < graph.keys.length; i++) {
      expect(Math.hypot(layout.x[i], layout.y[i])).toBeLessThanOrEqual(1.0001);
      expect(layout.depth[i]).toBeGreaterThanOrEqual(0);
    }
  });

  it('puts solved positions at height zero', () => {
    for (const g of graph.goals) expect(layout.z[g]).toBe(0);
  });

  it('finds start positions at requested distances from the goal', () => {
    for (const d of [12, 35]) {
      const key = service.findAtGoalDistance(graph, d)!;
      expect(graph.goalDist[graph.index.get(key)!]).toBe(d);
    }
  });
});
