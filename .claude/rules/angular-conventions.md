# Angular Conventions — Infinity Fun

Concrete patterns actually used in this repo. Two generations of code coexist; **prefer the modern (`math-quiz`) style for new features**, but match the surrounding file when editing existing code.

## Components

- **Standalone everywhere.** `standalone: true` with an explicit `imports` array. No component `NgModule`s. The only module is `src/app/shared/directives/directive.module.ts` (directive-only).
- **Bootstrap** is `bootstrapApplication(AppComponent, appConfig)` in `src/main.ts`; providers live in `src/app/app.config.ts` (`provideZoneChangeDetection({ eventCoalescing: true })`, `provideRouter` with `withInMemoryScrolling`, `provideAnimations`). Zone-based change detection — **not** zoneless.
- **Change detection**: default everywhere. No `ChangeDetectionStrategy.OnPush` in the codebase.
- **Routing**: flat `Routes` array in `src/app/app.routes.ts`, eager component references (no `loadComponent` lazy loading). The wildcard `{ path: '**', redirectTo: '' }` MUST stay last.

### Modern style (use for new features — see `src/app/math-quiz/`)
- **Inline `template:` string literals** in the `.ts`, with a separate `styleUrl` `.scss` file.
- **Signals for state**: `signal<T>(...)`, `computed(...)`, `.set()`, `.update()`. Services too (`readonly state = signal<...>(null)`).
- **`inject()`** for DI in components (e.g. `private readonly engine = inject(QuestionEngine)`).
- **New control flow** in templates: `@if` / `@for` (always with `track`) / `@switch`.
- Note existing inconsistency: math-quiz leaf components still use classic `@Input()` / `@Output() EventEmitter` decorators (not `input()`/`output()` signal APIs) — the signal input/output functions are not used anywhere yet.

### Legacy style (dominant in older games — e.g. `src/app/country-guesser/`)
- Separate `templateUrl` + `styleUrls`/`styleUrl` files.
- Plain typed class fields with initializers (`score: number = 0;`), mutable public properties.
- **Constructor injection** with `private`/`protected` params.
- Old control flow `*ngIf` / `*ngFor` / `[ngClass]`, importing `CommonModule`; `FormsModule` + `[(ngModel)]` for forms.
- `implements OnInit`, init logic in `ngOnInit()`.

## Services

- All shared/feature services are `@Injectable({ providedIn: 'root' })` singletons.
- Reactivity is mixed: some services expose RxJS `Observable`s (`scroll`, `periodic-table`), math-quiz services use signals. No single mandate — follow the feature's style.
- `LocalStorageService` is the typed wrapper for persistence — do not touch `window.localStorage` directly. Keys: prefer `src/app/core/constants/local-storage.const.ts` (`LocalStorageConst`) though newer code sometimes inlines keys.

## Styling / Theme

- Dark theme palette in `src/_colors.scss`: `$primary-bg-color: #121212`, `$primary-text-color: #f0f0f0`, `$button-bg-color: #008cba`, plus per-game accent vars (`$color-*`). Helper fns `lighten-color()` / `darken-color()`.
- Global `src/styles.scss` sets the mono font stack, `box-sizing: border-box`, body background, and a reusable `.game-container`.
- **New component SCSS: use `@use '../../colors' as colors;` then `colors.$var`** (modern). Legacy files use the deprecated `@import "../../colors";` with bare `$var` — don't copy that into new code.
- Per-game accent color is duplicated in **two places that must stay in sync**: `src/_colors.scss` (`$color-<game>`) and the `color` field in `GameRouteService`. Home binds it via `[style.--game-color]` → consumed as `var(--game-color)` for glow/hover.

## Adding a new game (end-to-end)

1. Create `src/app/<game-name>/` with a standalone component (flat folder for simple games; add `components/`, `models/`, `services/` for complex ones like `math-quiz/`).
2. Register the route in `src/app/app.routes.ts` (before the wildcard).
3. Add a `GameRoute` entry to the private `games` array in `src/app/shared/services/game-route/game-route.service.ts` (`name`, `route`, `color`; external links use a full URL + `isExternal: true`).
4. Add the matching `$color-<game>` to `src/_colors.scss` (keep it in sync with the service entry).
5. Reuse shared building blocks where useful: `LocalStorageService`, `SoundService` (`playCorrect()`/`playWrong()`), `LeftRightComparerComponent`, `appTypewriter` directive (via `DirectiveModule`).

The home dashboard is data-driven from `GameRouteService.getGames()` — no home/router edits beyond steps 2–3.

## TypeScript / Formatting

- `tsconfig.json`: `strict: true` plus `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch`. Target/module `ES2022`, `moduleResolution: "bundler"`. Angular `strictTemplates`, `strictInjectionParameters`, `strictInputAccessModifiers` all on.
- `.editorconfig`: 2-space indent, single quotes for `.ts`, final newline, trim trailing whitespace. Semicolons and trailing commas throughout.
- **No ESLint/Prettier** in the repo — formatting governed by `.editorconfig` + TS strictness only.

## Testing

- **Jasmine + Karma** (`ChromeHeadless`, deterministic order). Run with `npm test` (`ng test`). Coverage → `./coverage/infinityfun`.
- **Property-based testing with `fast-check`** is the norm for pure logic (see `src/app/math-quiz/services/*.spec.ts`): `fc.assert(fc.property(...))`, `fc.constantFrom`, re-implemented oracles for invariants. Tag tests back to the spec: `// Feature: <name>, Property N: ...`.
- TestBed: `configureTestingModule` in `beforeEach`, `TestBed.inject(Service)`; mock deps with `jasmine.createSpyObj` + `{ provide, useValue }`.
- Specs co-located as `*.spec.ts`. Coverage is uneven — math-quiz is well-tested; several older games have no specs.

## Build / Deploy / CI

- Build: `@angular-devkit/build-angular:application` (esbuild), `inlineStyleLanguage: scss`. Prod uses `baseHref: "/infinity-fun/"` (GitHub Pages), swaps `environment.ts` → `environment.prod.ts`. Bundle budgets: initial warn 800kB/error 2MB; component style warn 2kB/error 9kB.
- Deploy: `npm run deploy` → `angular-cli-ghpages` pushes to the `gh-pages` branch.
- CI (`.github/workflows/`): `ci.yml` on push/PR to `master` only runs `npm install` (no build/test/lint gate). `cd-on-commit.yml` on push to `master` reads a `vX.Y.Z` from the commit message and, if greater than the latest tag, tags + creates a Release + deploys. `cd.yml` deploys on `v*` tag push. Releases are driven by commit-message semver, not `package.json`.
