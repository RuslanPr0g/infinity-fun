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
    services/             game-route, local-storage, sound, scroll, periodic-table (root singletons)
    components/           home-link, left-right-comparer (reusable)
    directives/           appTypewriter (via DirectiveModule)
  app.routes.ts           flat, eager routes; wildcard redirect MUST stay last
  app.config.ts           bootstrap providers (zone-based CD, router, animations)
src/_colors.scss          dark-theme palette + per-game accent colors
```

## Architecture at a glance

- **Standalone components everywhere**; bootstrapped via `bootstrapApplication`. Zone-based change detection, default strategy (no OnPush).
- **Two code generations coexist.** Older games: separate templates, plain class fields, constructor DI, `*ngIf`/`*ngFor`. Newer `math-quiz`: inline templates, signals + `computed`, `inject()`, `@if`/`@for`/`@switch`. **Prefer the modern style for new work**; match the file when editing existing code.
- **Adding a game** touches three things: a route in `app.routes.ts`, a `GameRoute` entry in `game-route.service.ts`, and a matching `$color-<game>` in `_colors.scss` (the color is duplicated in both the service and the SCSS — keep them in sync). The home page needs no edits.
- **Persistence** goes through `LocalStorageService` (typed wrapper) — never `window.localStorage` directly. Audio via `SoundService.playCorrect()` / `playWrong()`.
- **Testing** leans on **property-based tests with `fast-check`** for pure logic (see `math-quiz` service specs), alongside standard Jasmine TestBed.

Full detail — component/service/styling/testing/CI conventions and the step-by-step "add a game" guide — is in the imported rule below.

@.claude/rules/angular-conventions.md

## Specs

Feature specs live under `.claude/specs/`. Current: [`math-quiz-game`](.claude/specs/math-quiz-game/README.md) (requirements, design, tasks).

## Skills

- **caveman** (`.claude/skills/caveman/`) — ultra-compressed response mode; activate with "caveman mode" or `/caveman`.
