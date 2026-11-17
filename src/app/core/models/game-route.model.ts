export type GameCategory = 'strategy' | 'brain' | 'reflex' | 'life';

export interface GameCategoryInfo {
  id: GameCategory;
  name: string;
  blurb: string;
}

export interface GameRoute {
  name: string;
  route: string;
  color?: string;
  isExternal?: boolean;
  /** Section on the home page. */
  category?: GameCategory;
  /** One line shown on the home card and used by search. */
  description?: string;
  /** Shows a NEW badge; the first new game is the featured card. */
  isNew?: boolean;
}
