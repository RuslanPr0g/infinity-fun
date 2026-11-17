# Angular Conventions — Infinity Fun

Concrete patterns used in this repo. Since v5.0.0 there is one style (the modern one) and one look (Figure Battle's).

## Components

- **Standalone everywhere.** `standalone: true` with an explicit `imports` array. No `NgModule`s.
- **Bootstrap** is `bootstrapApplication(AppComponent, appConfig)` in `src/main.ts`; providers live in `src/app/app.config.ts` (`provideZoneChangeDetection({ eventCoalescing: true })`, `provideRouter` with `withInMemoryScrolling`, `provideAnimations`). Zone-based change detection — **not** zoneless.
- **Change detection**: default everywhere. No `ChangeDetectionStrategy.OnPush` in the codebase.
- **Routing**: flat `Routes` array in `src/app/app.routes.ts`, eager component references (no `loadComponent` lazy loading). The wildcard `{ path: '**', redirectTo: '' }` MUST stay last.

### Component style
- **Inline `template:` string literals** in the `.ts`, with a separate `styleUrl` `.scss` file (tiny styles may be inline `styles:`).
- **Signals for state**: `signal<T>(...)`, `computed(...)`, `effect(...)`, `.set()`, `.update()`. Store-like state for one game goes in an `@Injectable()` provided by the game component (see `reject-cookies.store.ts`).
- **`inject()`** for DI. New components use `input()` / `output()` / `model()`; some older leaf components (math-quiz, chess) still use `@Input()` / `@Output()`, which is fine to leave.
- **New control flow** in templates: `@if` / `@for` (always with `track`) / `@switch`. No `CommonModule` for control flow.
- **Pure logic in `<game>.engine.ts`** (no Angular imports): random generation, scoring, rules. Pass an `rng` parameter so tests can seed it. Components only wire signals to the engine.

### Game screen
- Every game template starts with `<app-game-shell>` from `src/app/shared/ui` (`layout="page"` for quizzes/forms, `layout="fill"` for boards/canvases; `[help]` lines; `[sound]` for a mute button; extra bar buttons via `shellActions`).
- Dialogs, results and confirmations use `<ui-modal>` (`[closable]`, `[opaque]`, `size`), shown with `@if`.
- Scores use `<ui-stat-bar [stats]>`; mode pickers use `<ui-segmented [options] [(value)]>`.
- Canvas work goes through `CanvasStage` (`src/app/shared/canvas/canvas-stage.ts`): DPR-capped sizing, rAF loop outside the zone, `listen()` with cleanup, `invalidate()` for static drawings.
- Short landscape phones: use `@media (min-aspect-ratio: 4/3) and (max-height: 560px)` to put the board/picture beside the controls.

## Services

- All shared/feature services are `@Injectable({ providedIn: 'root' })` singletons.
- Prefer signals in services. `PeriodicTableService` still returns an `Observable` (it wraps `fetch`).
- `ViewportService` exposes media queries as signals (`isPhone`, `coarsePointer`, `canHover`, `reducedMotion`). Never read `window.innerWidth` for layout.
- `SoundService` has a site-wide `muted` signal (persisted); the shell toggles it.
- `LocalStorageService` is the typed wrapper for persistence — do not touch `window.localStorage` directly. Keys: prefer `src/app/core/constants/local-storage.const.ts` (`LocalStorageConst`) though newer code sometimes inlines keys.

## Styling / Theme

- **Tokens** live in `src/styles/_tokens.scss` (Sass values for maths, emitted as CSS custom properties on `:root`): `--bg`, `--surface`, `--panel`, `--card`, `--line`, `--text`, `--muted`, `--danger`, `--gold`, `--ok`, `--accent`. They are Figure Battle's values; `figure-battle-game.component.scss` reads them too.
- **Global `ui-*` classes** in `src/styles/_ui.scss`: `ui-btn` (`primary`, `ghost`, `danger`, `ok`, `seg` + `on`, `small`, `big`, `block`, `icon`), `ui-panel`, `ui-card`, `ui-input`, `ui-label`, `ui-chip`, `ui-stats`/`ui-stat`, `ui-bar`, `ui-kicker`, `ui-muted`, `ui-toast`, `ui-shake`, `sr-only`. Use them before writing component CSS. Don't name component classes after `ui-btn` modifiers (`.big`, `.small`, `.on`, `.block`): they collide.
- **Component SCSS**: `@use 'tokens' as t;` and `@use 'breakpoints' as bp;` (resolved via `stylePreprocessorOptions.includePaths: ["src/styles"]`). Prefer `var(--…)` in rules and `t.$…` only for Sass maths like `rgba(t.$danger, 0.2)`.
- **Accent color**: `--accent` follows `--game-color`, which `GameShellComponent` sets from `GameRouteService` (the single source of each game's color). `--on-accent` (text on accent) is picked automatically for contrast.
- **Breakpoints**: `bp.phone` (≤480), `bp.tablet` (≤760), `bp.short` (height ≤520), `bp.touch`, `bp.hover`. Use `dvh`, never `vh`.
- **Font**: Inter (loaded in `index.html`), with system fallbacks.
- Hex colors in component styles are only for game content (board squares, element tiles, the fake site in Reject Cookies).

## Adding a new game (end-to-end)

1. Create `src/app/<game-name>/` with a standalone component and a pure `<game>.engine.ts` (add `components/`, `models/`, `services/` for bigger games).
2. Wrap the template in `<app-game-shell>` with `[help]` lines. Build the UI from `ui-*` classes and `shared/ui` components.
3. Register the route in `src/app/app.routes.ts` (before the wildcard).
4. Add a `GameRoute` entry to the private `games` array in `src/app/shared/services/game-route/game-route.service.ts` (`name`, `route`, `color`, `category`, `description`; external links use a full URL + `isExternal: true`). Optionally add cover art in `src/app/home/game-art/game-art.component.ts`.
5. Reuse shared pieces: `LocalStorageService` (keys in `LocalStorageConst`), `SoundService`, `ViewportService`, `CanvasStage`, `LeftRightComparerComponent`.
6. Check it at 360×640, 390×844, 844×390 and desktop; write text per `copy-style.md`; add `fast-check` tests for the engine.

The home dashboard is data-driven from `GameRouteService.getGames()`: no home edits needed.

## TypeScript / Formatting

- `tsconfig.json`: `strict: true` plus `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch`. Target/module `ES2022`, `moduleResolution: "bundler"`. Angular `strictTemplates`, `strictInjectionParameters`, `strictInputAccessModifiers` all on.
- `.editorconfig`: 2-space indent, single quotes for `.ts`, final newline, trim trailing whitespace. Semicolons and trailing commas throughout.
- **No ESLint/Prettier** in the repo — formatting governed by `.editorconfig` + TS strictness only.

## Testing

- **Jasmine + Karma** (`ChromeHeadless`, deterministic order). Run with `npm test` (`ng test`). Coverage → `./coverage/infinityfun`.
- **Property-based testing with `fast-check`** is the norm for pure logic (see `src/app/math-quiz/services/*.spec.ts`): `fc.assert(fc.property(...))`, `fc.constantFrom`, re-implemented oracles for invariants. Tag tests back to the spec: `// Feature: <name>, Property N: ...`.
- TestBed: `configureTestingModule` in `beforeEach`, `TestBed.inject(Service)`; mock deps with `jasmine.createSpyObj` + `{ provide, useValue }`.
- Specs co-located as `*.spec.ts`. Every game has engine or service specs (property tests); most also have a small component spec. Components that use `<app-game-shell>` need `provideRouter([])` in TestBed, and a `SoundService` mock needs `muted: () => false`.

## Build / Deploy / CI

- Build: `@angular-devkit/build-angular:application` (esbuild), `inlineStyleLanguage: scss`. Prod uses `baseHref: "/infinity-fun/"` (GitHub Pages), swaps `environment.ts` → `environment.prod.ts`. Bundle budgets: initial warn 800kB/error 2MB; component style warn 2kB/error 9kB.
- Deploy: `npm run deploy` → `angular-cli-ghpages` pushes to the `gh-pages` branch.
- CI (`.github/workflows/`): `ci.yml` on push/PR to `master` only runs `npm install` (no build/test/lint gate). `cd-on-commit.yml` on push to `master` reads a `vX.Y.Z` from the commit message and, if greater than the latest tag, tags + creates a Release + deploys. `cd.yml` deploys on `v*` tag push. Releases are driven by commit-message semver, not `package.json`.
