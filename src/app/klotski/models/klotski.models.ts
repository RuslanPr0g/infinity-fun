export const BOARD_COLS = 4;
export const BOARD_ROWS = 5;

export type PieceKind = 'big' | 'wide' | 'tall' | 'small';

export interface Piece {
  readonly id: number;
  readonly kind: PieceKind;
  readonly row: number;
  readonly col: number;
}

export interface Cell {
  row: number;
  col: number;
}

export interface Move {
  pieceId: number;
  row: number;
  col: number;
}

export interface Successor extends Move {
  key: string;
}

export type PresetId = 'classic' | 'easy' | 'medium';

export interface Preset {
  id: PresetId;
  label: string;
  /** Optimal moves-to-goal of the start position; null = the classic layout itself. */
  goalDistance: number | null;
}

export type ViewMode = '2d' | '3d';
export type EdgeMode = 'tree' | 'all' | 'none';

/**
 * The full state space. Node i is the position `keys[i]`; an edge is one legal
 * move (a piece relocated along any path of single-cell slides).
 */
export interface StateGraph {
  keys: string[];
  index: Map<string, number>;
  adj: number[][];
  /** Optimal number of moves from each node to the nearest solved node. */
  goalDist: Int32Array;
  maxGoalDist: number;
  goals: number[];
  edgeCount: number;
}

/** Positions for every node, rooted at the start of the current attempt. */
export interface GraphLayout {
  root: number;
  /** Radial tree layout: ring = moves from the start. */
  x: Float32Array;
  y: Float32Array;
  /** Height = moves still needed to solve (the third dimension). */
  z: Float32Array;
  depth: Int32Array;
  parent: Int32Array;
  maxDepth: number;
}
