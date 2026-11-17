import { Injectable } from '@angular/core';
import { GameCategoryInfo, GameRoute } from '../../../core/models/game-route.model';

@Injectable({
  providedIn: 'root',
})
export class GameRouteService {
  // Please, make sure that the colors are matching the color scheme here: _colors.scss
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
      color: '#1648a3',
      category: 'brain',
      description: 'Name the elements and learn the periodic table.',
    },
    {
      name: 'Guess Day of Week',
      route: '/guess-day-of-week',
      color: '#F59E0B',
      category: 'brain',
      description: 'Which weekday was that date? Train your calendar brain.',
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
      description: 'Spot the country from its flag. How long can your streak go?',
    },
    {
      name: 'Math Comparer',
      route: '/math-comparer',
      color: '#044d4d',
      category: 'brain',
      description: 'Which side is bigger? Compare expressions at a glance.',
    },
    {
      name: 'Color Reaction',
      route: '/color-click',
      color: '#EC4899',
      category: 'reflex',
      description: 'Click the moment the color changes. Test your reaction time.',
    },
    {
      name: 'Months Left',
      route: '/left-to-live',
      color: '#EF4444',
      category: 'life',
      description: 'See the months you have left, and how they\'ll be spent.',
    },
    {
      name: 'Date Countdown',
      route: '/date-countdown',
      color: '#9c1d1d',
      category: 'life',
      description: 'Count down to any date and share the countdown.',
    },
    {
      name: 'Math Quiz',
      route: '/math-quiz',
      color: '#f97316',
      category: 'brain',
      description: 'Quick-fire arithmetic rounds against the clock.',
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
}
