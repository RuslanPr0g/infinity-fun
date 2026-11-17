# Infinity Fun

A collection of browser mini-games and interactive visualizations, built as a single **Angular 18** standalone-API app. Deployed to GitHub Pages under `/infinity-fun/`.

## Commands

```bash
npm start      # ng serve → http://localhost:4200
npm run build  # ng build (prod: baseHref /infinity-fun/, env → environment.prod.ts)
npm test       # ng test → Jasmine + Karma (ChromeHeadless)
npm run deploy  # angular-cli-ghpages → gh-pages branch
```

No lint step exists (no ESLint/Prettier). Formatting is governed by `.editorconfig` (2-space, single quotes) and strict TypeScript.

## Layout

```
src/app/
  <game-name>/            each game is a standalone component + route (flat, or with
                          components/ models/ services/ for complex ones like math-quiz/)
  home/                   data-driven dashboard listing all games
  core/                   GameRoute model, localStorage key constants
  shared/
    ui/                   GameShell, UiModal, StatBar, Segmented, color helpers (barrel: shared/ui)
    canvas/               CanvasStage: HiDPI canvas + rAF loop + pointer helpers
    services/             game-route, local-storage, sound, viewport, periodic-table (root singletons)
    components/           left-right-comparer (reusable)
  app.routes.ts           flat, eager routes; wildcard redirect MUST stay last
  app.config.ts           bootstrap providers (zone-based CD, router, animations)
src/styles/               _tokens.scss (design tokens), _ui.scss (global ui-* classes), _breakpoints.scss
src/styles.scss           global base styles; imports tokens + ui
```

## Architecture at a glance

- **Standalone components everywhere**; bootstrapped via `bootstrapApplication`. Zone-based change detection, default strategy (no OnPush).
- **One look everywhere, taken from Figure Battle** (the reference game): dark navy, Inter, rounded panels, `ui-*` buttons. Every game sits in `<app-game-shell>` (full screen, top bar with Back / title / sound / help). Figure Battle keeps its own full-screen canvas shell but reads the same tokens.
- **Modern Angular style only**: inline templates, signals + `computed`, `inject()`, `@if`/`@for`/`@switch`. Game logic lives in pure `*.engine.ts` files with `fast-check` property tests; components stay thin.
- **Mobile first**: every game is checked at 360×640, 390×844, 844×390 (landscape) and desktop. No hover-only or keyboard-only actions.
- **Adding a game** touches two things: a route in `app.routes.ts` and a `GameRoute` entry in `game-route.service.ts` (its `color` is the game's only accent color; the shell and home read it from there). The home page needs no edits.
- **Wording** follows `.claude/rules/copy-style.md`: plain, short, no AI-isms.
- **Persistence** goes through `LocalStorageService` (typed wrapper) — never `window.localStorage` directly. Audio via `SoundService.playCorrect()` / `playWrong()` (site-wide mute, toggled from the shell). Media queries via `ViewportService` signals, never `window.innerWidth`.
- **Testing** leans on **property-based tests with `fast-check`** for pure logic (see `math-quiz` service specs), alongside standard Jasmine TestBed.

Full detail — component/service/styling/testing/CI conventions and the step-by-step "add a game" guide — is in the imported rule below.

@.claude/rules/angular-conventions.md
@.claude/rules/copy-style.md

## Deploying (push to `master`)

`cd-on-commit.yml` runs on every push to `master` and looks for a `vX.Y.Z` version string in the **latest commit message**. If found and greater than the latest existing tag, it tags the commit, creates a GitHub Release, and runs `npm run deploy` (publishes to `gh-pages`). No version string (or a version not greater than the latest tag) → push lands on `master` with no deploy.

So: to deploy, include the next semver (check `git tag --list 'v*' | sort -V | tail -5` for the latest) somewhere in the commit message, e.g. `Add feature X (v4.10.0)`, then push directly to `master`.

Bump rule: a **new game** is a MINOR bump (`vX.Y.0`, e.g. `v4.10.8` → `v4.11.0`), not a patch — even though it doesn't break anything, it's new user-facing functionality, not a fix. Reserve patch bumps (`vX.Y.Z`) for fixes/tweaks to existing games.

## Specs

Feature specs live under `.claude/specs/`. Current: [`math-quiz-game`](.claude/specs/math-quiz-game/README.md) (requirements, design, tasks), [`ui-unification`](.claude/specs/ui-unification/scratchpad.md) (the v5 redesign checklist).

## Skills

- **caveman** (`.claude/skills/caveman/`) — ultra-compressed response mode; activate with "caveman mode" or `/caveman`.
