# UI unification scratchpad

Reference look: **Figure Battle** (`src/app/figure-battle/`). Everything else should match it.
Plan: `~/.claude/plans/pasted-content-id-4447-create-scratchpa-swift-rain.md`. Release: one v5.0.0 at the end.

## Done checklist (per game)
1. Inside `<app-game-shell>`. No `.game-container`, no `88px` maths, no `100vh`.
2. Shared tokens + `ui-*` classes only. Hex colors only for game content.
3. Modern style: inline template, signals, `inject()`, `@if`/`@for`, `@use`.
4. Mobile: no sideways scroll at 360×640 / 390×844 / 844×390 / 1440×900, taps ≥44px, nothing hover-only or keyboard-only.
5. Text rewritten in plain English (`.claude/rules/copy-style.md`).
6. Specs updated.

## Status
| # | Piece | Was | Target | 1 | 2 | 3 | 4 | 5 | 6 |
|---|-------|-----|--------|---|---|---|---|---|---|
| 0 | Foundation | fonts Intel One Mono, `#121212`, global home-link header | tokens, `ui-*`, shell, modal, CanvasStage, ViewportService | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1 | Starfield | 74 animated DOM nodes | one canvas | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 2 | Math Comparer + comparer | `100vh-88px`, `innerWidth` check, fixed OR badge | stacked on phones | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 3 | Color Reaction | 480px button, odd overlay, 100px cells | fitted grid, modal result | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 4 | Country Guesser | 480/360px min-widths | full-width flag, 2-col answers | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 5 | Guess Day of Week | gradient buttons, `100vh-88px` | 4+3 day grid | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 6 | Periodic Quiz | `min-width:500px` card | modal detail sheet | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 7 | Math Quiz | modern, own palette | tokens, stat bar | | | | | | |
| 8 | Months Left | ~1000 spans | canvas grid | | | | | | |
| 9 | Date Countdown | emoji edit span | scroll shell, real buttons | | | | | | |
| 10 | Reject Cookies | hover-only flee, 39 hex | touch flee, clean frame | | | | | | |
| 11 | Sea Battle | 50px cells, reversed breakpoints | fluid grid | | | | | | |
| 12 | Chessle | own palette | tokens, modal | | | | | | |
| 13 | Opening Trainer | hover-only preview | tap preview | | | | | | |
| 14 | Unusual Chess | 5 copied overlays | UiModal, fluid board | | | | | | |
| 15 | Klotski | own canvas loop, 24 hex | CanvasStage, tokens | | | | | | |
| 16 | Home + docs + release | home-link component | footer version, docs, v5.0.0 | | | | | | |

## Notes
- Phone check: same-origin iframes at 360×640 / 390×844 / 844×390 (the browser window can't be resized).
- Found while testing: math quiz estimation could freeze (endless distractor loop) and hard mode gave negative answers. Fixed in the foundation commit.
- Math Comparer: `new Function` eval replaced by a small parser (`math-comparer.engine.ts`), best streak is now saved.
