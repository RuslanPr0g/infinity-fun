import {
  trigger,
  transition,
  query,
  style,
  animate,
} from '@angular/animations';

export const routeTransition = trigger('routeTransition', [
  transition('* => *', [
    query(
      ':enter',
      [
        style({ filter: 'brightness(0)' }),
        animate('200ms ease-out', style({ filter: 'brightness(1)' })),
      ],
      { optional: true }
    ),

    query(
      ':leave',
      [animate('100ms ease-in-out', style({ filter: 'brightness(0)' }))],
      { optional: true }
    ),
  ]),
]);
