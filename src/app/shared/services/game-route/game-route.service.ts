import { Injectable } from '@angular/core';
import { GameCategoryInfo, GameRoute } from '../../../core/models/game-route.model';

@Injectable({
  providedIn: 'root',
})
export class GameRouteService {
  // The one place each game's accent color lives. GameShellComponent and the home page read it from here.
  private games: GameRoute[] = [
    {
      name: 'Figure Battle',
      route: '/figure-battle',
      color: '#3EC5FF',
      category: 'strategy',
      description: 'Deploy shapes, out-think the enemy army, win 12 tactical missions.',
      isNew: true,
    },
    {
      name: 'Klotski Graph',
      route: '/klotski',
      color: '#84CC16',
      category: 'strategy',
      description: 'Slide the blocks free and explore the puzzle\'s whole state graph.',
    },
    {
      name: 'Unusual Chess',
      route: '/chess',
      color: '#14B8A6',
      category: 'strategy',
      description: 'Chess with a twist: simultaneous moves, burning boards and a bot.',
    },
    {
      name: 'Opening Trainer',
      route: '/chess-openings',
      color: '#A855F7',
      category: 'strategy',
      description: 'Learn real openings move by move from the lichess database.',
    },
    {
      name: 'Chessle',
      route: '/chessle',
      color: '#EAB308',
      category: 'strategy',
      description: 'Wordle, but you guess a chess opening. New puzzle every day.',
    },
    {
      name: 'Sea Battle Matrix',
      route: '/seabattle',
      color: '#0EA5E9',
      category: 'strategy',
      description: 'Battleship helper that shows where ships most likely hide.',
    },
    {
      name: 'Periodic Quiz',
      route: '/periodic',
      color: '#3B82F6',
      category: 'brain',
      description: 'See a symbol, name the element.',
    },
    {
      name: 'Guess Day of Week',
      route: '/guess-day-of-week',
      color: '#F59E0B',
      category: 'brain',
      description: 'See a date, pick its day of the week.',
    },
    {
      name: 'Reject All Cookies',
      route: '/reject-cookies',
      color: '#6366F1',
      category: 'reflex',
      description: 'Fight your way through sneaky consent popups. Reject them all.',
    },
    {
      name: 'Country Guesser',
      route: '/country-guesser',
      color: '#10B981',
      category: 'brain',
      description: 'Guess the country from its flag. Keep your streak going.',
    },
    {
      name: 'Math Comparer',
      route: '/math-comparer',
      color: '#8B5CF6',
      category: 'brain',
      description: 'Which side is bigger? Compare expressions at a glance.',
    },
    {
      name: 'Color Reaction',
      route: '/color-click',
      color: '#EC4899',
      category: 'reflex',
      description: 'Tap the matching color as fast as you can. 60 seconds.',
    },
    {
      name: 'Months Left',
      route: '/left-to-live',
      color: '#EF4444',
      category: 'life',
      description: 'See the months you have left, one dot each.',
    },
    {
      name: 'Date Countdown',
      route: '/date-countdown',
      color: '#FB7185',
      category: 'life',
      description: 'Count down to a date and share the link.',
    },
    {
      name: 'Math Quiz',
      route: '/math-quiz',
      color: '#f97316',
      category: 'brain',
      description: 'Ten quick sums against the clock.',
    },
    {
      name: 'Algorithms Graph',
      route: 'https://ruslanpr0g.github.io/algo-graph/',
      color: '#6B7280',
      isExternal: true,
      category: 'brain',
      description: 'Watch graph algorithms explore, step by step.',
    },
  ];

  private categories: GameCategoryInfo[] = [
    { id: 'strategy', name: 'Strategy & Board', blurb: 'Tactics, chess and puzzles' },
    { id: 'brain', name: 'Brain & Quiz', blurb: 'Facts, numbers and memory' },
    { id: 'reflex', name: 'Reflex & Fun', blurb: 'Quick hands, quick laughs' },
    { id: 'life', name: 'Life & Time', blurb: 'Dates, countdowns and perspective' },
  ];

  getGames(): GameRoute[] {
    return this.games;
  }

  getCategories(): GameCategoryInfo[] {
    return this.categories;
  }

  /** The game for an app route such as `/chess`, or undefined. */
  byRoute(route: string): GameRoute | undefined {
    return this.games.find((g) => !g.isExternal && g.route === route);
  }
}
