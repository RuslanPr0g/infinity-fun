import { Component, input } from '@angular/core';

/**
 * Hand-made cover illustration for each game, as inline SVG (crisp at any size, no image requests).
 * Everything is drawn in `currentColor`, so the host's `color` sets the game's accent.
 */
let nextUid = 0;

@Component({
  selector: 'app-game-art',
  standalone: true,
  template: `
    <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient [attr.id]="uid + 'g'" cx="50%" cy="55%" r="65%">
          <stop offset="0" stop-color="currentColor" stop-opacity="0.35" />
          <stop offset="1" stop-color="currentColor" stop-opacity="0" />
        </radialGradient>
        <pattern [attr.id]="uid + 'd'" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.6" fill="#fff" fill-opacity="0.12" />
        </pattern>
      </defs>
      <rect width="160" height="100" [attr.fill]="'url(#' + uid + 'd)'" />
      <rect width="160" height="100" [attr.fill]="'url(#' + uid + 'g)'" />
      @switch (route()) {
        @case ('/figure-battle') {
          <line x1="80" y1="8" x2="80" y2="92" class="dash" />
          <g class="fill-soft">
            <circle cx="28" cy="30" r="6" /><circle cx="40" cy="44" r="6" /><circle cx="28" cy="58" r="6" />
            <polygon points="52,24 62,30 52,36" /><rect x="44" y="64" width="12" height="12" />
          </g>
          <g class="red">
            <circle cx="132" cy="30" r="6" /><circle cx="120" cy="50" r="6" /><circle cx="132" cy="70" r="6" />
            <polygon points="108,24 98,30 108,36" /><rect x="102" y="62" width="12" height="12" />
            <polygon points="140,44 143,51 150,51 144,55 146,62 140,58 134,62 136,55 130,51 137,51" />
          </g>
          <line x1="64" y1="30" x2="96" y2="30" class="bullet" />
        }
        @case ('/klotski') {
          <g class="stroke">
            <rect x="22" y="14" width="68" height="72" rx="4" class="frame" />
            <rect x="26" y="18" width="14" height="30" rx="3" /><rect x="72" y="18" width="14" height="30" rx="3" />
            <rect x="26" y="52" width="14" height="30" rx="3" /><rect x="72" y="52" width="14" height="30" rx="3" />
            <rect x="44" y="52" width="24" height="12" rx="3" />
            <rect x="44" y="68" width="10" height="10" rx="2" /><rect x="58" y="68" width="10" height="10" rx="2" />
          </g>
          <rect x="44" y="18" width="24" height="30" rx="3" class="fill" />
          <g class="stroke thin"><path d="M104 30 L124 22 L142 36 L128 56 L108 50 Z M124 22 L128 56 M108 50 L142 36" /></g>
          <g class="fill"><circle cx="104" cy="30" r="3.5" /><circle cx="124" cy="22" r="3.5" /><circle cx="142" cy="36" r="3.5" /><circle cx="128" cy="56" r="3.5" /><circle cx="108" cy="50" r="3.5" /></g>
          <g class="white"><circle cx="128" cy="74" r="3.5" /></g>
          <path d="M128 56 L128 74" class="stroke thin dash2" />
        }
        @case ('/chess') {
          <g transform="translate(18 14)">
            @for (i of eight; track i) {
              @for (j of eight; track j) {
                @if ((i + j) % 2 === 0) { <rect [attr.x]="i * 9" [attr.y]="j * 9" width="9" height="9" class="sq" /> }
              }
            }
            <rect x="0" y="0" width="72" height="72" class="stroke frame" fill="none" />
            <rect x="0" y="0" width="72" height="9" class="burn" /><rect x="0" y="63" width="72" height="9" class="burn" />
          </g>
          <text x="58" y="56" class="glyph small white-t">&#9819;&#xFE0E;</text>
          <text x="124" y="72" class="glyph big">&#9822;&#xFE0E;</text>
        }
        @case ('/chess-openings') {
          <g transform="translate(70 10)">
            @for (i of eight; track i) {
              @for (j of eight; track j) {
                @if ((i + j) % 2 === 1) { <rect [attr.x]="i * 10" [attr.y]="j * 10" width="10" height="10" class="sq" /> }
              }
            }
            <!-- 1. e4: e2 → e4 -->
            <path d="M45 65 V52" class="arrow" /><polygon points="45,43 39,52 51,52" class="fill" />
            <!-- 1… e5: e7 → e5 (black, faint) -->
            <path d="M45 15 V28" class="arrow faint" /><polygon points="45,37 39,28 51,28" class="fill faint-f" />
            <!-- 2. Nf3: g1 → f3, knight L -->
            <path d="M65 75 V55 H64" class="arrow" /><polygon points="56,55 65,49 65,61" class="fill" />
          </g>
          <text x="14" y="34" class="label">1. e4</text><text x="14" y="54" class="label faint-t">1… e5</text><text x="14" y="74" class="label">2. Nf3</text>
        }
        @case ('/chessle') {
          @for (row of [0, 1, 2]; track row) {
            @for (col of [0, 1, 2, 3, 4]; track col) {
              <rect [attr.x]="28 + col * 22" [attr.y]="16 + row * 24" width="18" height="20" rx="3"
                [class]="'tile t' + chessleTiles[row][col]" />
            }
          }
          <text x="37" y="31" class="glyph tiny">&#9817;&#xFE0E;</text><text x="59" y="31" class="glyph tiny">&#9816;&#xFE0E;</text>
          <text x="81" y="55" class="glyph tiny">&#9815;&#xFE0E;</text><text x="103" y="55" class="glyph tiny">&#9813;&#xFE0E;</text>
          <text x="125" y="79" class="glyph tiny">&#9812;&#xFE0E;</text>
        }
        @case ('/seabattle') {
          <g transform="translate(35 8)">
            @for (i of ten; track i) {
              <line [attr.x1]="i * 9" y1="0" [attr.x2]="i * 9" y2="81" class="grid" />
              <line x1="0" [attr.y1]="i * 9" x2="81" [attr.y2]="i * 9" class="grid" />
            }
            @for (h of heat; track $index) { <rect [attr.x]="h[0] * 9" [attr.y]="h[1] * 9" width="9" height="9" [attr.fill-opacity]="h[2]" class="heat" /> }
            <rect x="9" y="18" width="36" height="9" rx="4" class="ship" /><rect x="54" y="45" width="9" height="27" rx="4" class="ship" />
            <path d="M65 11 l5 5 m0 -5 l-5 5 M20 56 l5 5 m0 -5 l-5 5" class="hit" />
          </g>
        }
        @case ('/periodic') {
          @for (e of elements; track e.s) {
            <g [attr.transform]="'translate(' + e.x + ' ' + e.y + ')'">
              <rect width="30" height="32" rx="3" [class]="e.hi ? 'el hi' : 'el'" />
              <text x="4" y="9" class="num">{{ e.n }}</text>
              <text x="15" y="25" class="sym">{{ e.s }}</text>
            </g>
          }
        }
        @case ('/guess-day-of-week') {
          <g transform="translate(46 12)">
            <rect width="68" height="76" rx="6" class="page" />
            <rect width="68" height="18" rx="6" class="fill" /><rect y="10" width="68" height="8" class="fill" />
            <circle cx="18" cy="-2" r="3" class="white" /><circle cx="50" cy="-2" r="3" class="white" />
            <text x="34" y="62" class="q">?</text>
          </g>
          <text x="20" y="34" class="label faint-t">MON</text><text x="122" y="34" class="label faint-t">FRI</text>
          <text x="16" y="74" class="label faint-t">WED</text><text x="124" y="74" class="label">SUN</text>
        }
        @case ('/reject-cookies') {
          <mask [attr.id]="uid + 'bite'">
            <rect width="160" height="100" fill="#fff" />
            <circle cx="72" cy="28" r="9" fill="#000" /><circle cx="78" cy="40" r="7" fill="#000" />
          </mask>
          <g [attr.mask]="'url(#' + uid + 'bite)'">
            <circle cx="50" cy="50" r="28" class="cookie" />
            <g class="chip"><circle cx="40" cy="40" r="3.5" /><circle cx="56" cy="60" r="3.5" /><circle cx="36" cy="62" r="3" /><circle cx="58" cy="44" r="2.5" /></g>
          </g>
          <rect x="88" y="54" width="62" height="22" rx="11" class="pill" />
          <text x="119" y="68" class="pill-t">Reject all</text>
          <path d="M113 22 l12 12 m0 -12 l-12 12" class="hit" />
        }
        @case ('/country-guesser') {
          <circle cx="62" cy="50" r="34" class="stroke frame" fill="none" />
          <ellipse cx="62" cy="50" rx="14" ry="34" class="stroke thin" fill="none" />
          <path d="M28 50 H96 M33 33 H91 M33 67 H91" class="stroke thin" />
          <path d="M50 30 q8 -4 12 2 q6 6 -2 10 q-8 2 -6 10 q-8 -2 -6 -12 z M70 56 q10 0 8 10 q-4 6 -10 2 z" class="fill" />
          <g transform="translate(106 26)">
            <line x1="0" y1="0" x2="0" y2="52" class="pole" />
            <rect x="0" y="0" width="34" height="8" class="fill" /><rect x="0" y="8" width="34" height="8" class="white" /><rect x="0" y="16" width="34" height="8" class="red" />
          </g>
        }
        @case ('/math-comparer') {
          <rect x="14" y="30" width="54" height="40" rx="8" class="box" /><rect x="92" y="30" width="54" height="40" rx="8" class="box" />
          <text x="41" y="56" class="expr">7×8</text><text x="119" y="56" class="expr">9×6</text>
          <text x="80" y="60" class="cmp">&gt;</text>
        }
        @case ('/color-click') {
          <circle cx="80" cy="50" r="38" class="ring r1" /><circle cx="80" cy="50" r="27" class="ring r2" />
          <circle cx="80" cy="50" r="16" class="ring r3" /><circle cx="80" cy="50" r="6" class="white" />
          <path d="M104 64 l14 30 l5 -12 l12 -4 z" class="cursor" />
          <path d="M30 20 l6 6 M24 50 h8 M30 80 l6 -6 M130 20 l-6 6" class="spark" />
        }
        @case ('/left-to-live') {
          <g transform="translate(26 14)">
            @for (m of months; track $index) {
              <rect [attr.x]="m.x" [attr.y]="m.y" width="4.4" height="4.4" rx="1" [class]="m.used ? 'm used' : 'm'" />
            }
          </g>
        }
        @case ('/date-countdown') {
          <path d="M60 14 h40 M60 86 h40 M64 14 q0 26 16 36 q-16 10 -16 36 M96 14 q0 26 -16 36 q16 10 16 36" class="stroke frame" fill="none" />
          <path d="M70 30 h20 q-4 12 -10 16 q-6 -4 -10 -16 z M68 82 q4 -14 12 -16 q8 2 12 16 z" class="fill" />
          <line x1="80" y1="50" x2="80" y2="66" class="sand" />
          <text x="22" y="56" class="digits">12</text><text x="138" y="56" class="digits">04</text>
        }
        @case ('/math-quiz') {
          <circle cx="80" cy="50" r="30" class="track" /><circle cx="80" cy="50" r="30" class="timer" />
          <text x="80" y="58" class="expr">42</text>
          <text x="22" y="34" class="op">+</text><text x="132" y="34" class="op">×</text>
          <text x="24" y="80" class="op">−</text><text x="134" y="82" class="op">÷</text>
        }
        @default {
          <path d="M30 70 L58 34 L92 52 L122 24 M58 34 L76 82 L92 52 M30 70 L76 82" class="stroke thin" />
          <path d="M30 70 L58 34 L92 52 L122 24" class="stroke frame" fill="none" />
          <g class="fill"><circle cx="30" cy="70" r="6" /><circle cx="58" cy="34" r="6" /><circle cx="92" cy="52" r="6" /><circle cx="122" cy="24" r="6" /></g>
          <circle cx="76" cy="82" r="6" class="white" />
        }
      }
    </svg>
  `,
  styleUrl: './game-art.component.scss',
})
export class GameArtComponent {
  /** Unique per instance: SVG ids are document-global and the gradient must pick up this card's color. */
  readonly uid = `ga${nextUid++}`;
  readonly route = input.required<string>();

  readonly eight = [0, 1, 2, 3, 4, 5, 6, 7];
  readonly chessleTiles = [[1, 2, 0, 2, 1], [0, 2, 0, 1, 0], [0, 0, 0, 0, 0]];
  readonly ten = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  readonly months = Array.from({ length: 216 }, (_, i) => ({ x: (i % 18) * 6, y: Math.floor(i / 18) * 6, used: i < 131 }));
  readonly heat = [[3, 4, 0.25], [4, 4, 0.5], [5, 4, 0.35], [4, 3, 0.3], [4, 5, 0.6], [5, 5, 0.4], [3, 5, 0.2], [6, 2, 0.15], [1, 6, 0.2]];
  readonly elements = [
    { x: 20, y: 18, n: 1, s: 'H', hi: false },
    { x: 54, y: 18, n: 2, s: 'He', hi: false },
    { x: 88, y: 18, n: 6, s: 'C', hi: true },
    { x: 37, y: 54, n: 8, s: 'O', hi: false },
    { x: 71, y: 54, n: 26, s: 'Fe', hi: false },
    { x: 110, y: 54, n: 79, s: 'Au', hi: true },
  ];
}
