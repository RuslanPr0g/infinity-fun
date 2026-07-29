/** One entry from the lichess-org/chess-openings dataset. */
export interface Opening {
  readonly id: string;
  readonly eco: string;
  readonly name: string;
  /** SAN move tokens from the starting position, e.g. ['e4', 'e5', 'Nf3']. */
  readonly moves: ReadonlyArray<string>;
}
