# Stockfish "Engine" Bot — Implementation Plan

## Problem Statement

Add a 4th bot difficulty, **Engine (Stockfish-powered)**, that runs Stockfish 18 WASM in a Web
Worker for both existing unusual chess modes. Includes a redesigned opponent-select UI with grouped
bot tiers, a cached WASM loader with an enforced 3-second minimum loading screen, and a FEN bridge
that feeds the current board to Stockfish and maps best-move suggestions back through each variant's
legal-intent filter.

---

## Requirements

- Stockfish runs in a Web Worker, loaded lazily only when the Engine bot is selected
- WASM file (~7MB lite build) is cached in the browser (Cache API / HTTP cache via `public/` folder)
- Loading screen shows a chess-themed animation, enforces ≥3 seconds on first load, skips instantly if already cached
- Stockfish bot uses: Stockfish for positional suggestion → hard-bot heuristic filter to pick the best legal variant move matching Stockfish's intent
- FEN bridge converts the internal `Board` + `GamePosition` → standard FEN string
- Move-bridge maps Stockfish UCI `bestmove` (e.g. `e2e4`) back to a `MoveIntent`
- For 15×15 Royale: board projected to "virtual 8×8" (scale file/rank to nearest 8×8 equivalent) for FEN input; Stockfish suggestion re-projected back
- Opponent-select UI redesigned: grouped sections (Hotseat / vs Bot), difficulty cards with icons, "Engine" card has a special badge and is clearly distinguished

---

## Background

- `stockfish` npm package (Chess.com's `stockfish-18-lite-single.js` + `.wasm`) — ~7MB, no CORS
  headers needed (single-threaded), loads via `new Worker()`
- Angular 18 doesn't support importing the Stockfish WASM bundle through the TypeScript module
  graph — must be served from `public/` and loaded as `new Worker('/stockfish-18-lite-single.js')`
  at runtime
- UCI protocol: send `uci` → wait for `uciok`, then `isready` → wait for `readyok`, then
  `position fen <fen>`, then `go movetime 500` → parse `bestmove <move>`
- The `Board` → FEN conversion only needs piece placement + side-to-move (no en passant, no
  castling in these modes)
- Royale 15×15 projection: map each piece's file/rank linearly to 0–7 range; Stockfish's returned
  square names are re-mapped back; if mapping has collisions (two pieces land on same 8×8 square),
  fall back to hard-bot
- Caching strategy: serve `stockfish-18-lite-single.js` + `.wasm` from `public/` with long cache
  headers, use `Cache API` to detect "already cached" → skip the 3s minimum wait

### FEN Feasibility Note

The internal `Board` uses a flat array with file/rank helpers that map 1:1 to algebraic notation
(a1–h8). A `boardToFen()` utility iterates the 8×8 board, outputs standard FEN piece placement +
side to move + castling rights (none, since both modes strip castling) + halfmove/fullmove counters.
Stockfish returns UCI move strings (e.g. `e2e4`, `e7e8q`) which map cleanly back to `Square`
indices via `parseSquare`. For 15×15 Royale, the board is cropped to an 8×8 sub-region for
Stockfish's positional intuition, then the variant's legal-move filter validates the result.

---

## Proposed Solution

A `StockfishService` (Angular injectable) owns the Web Worker lifecycle and exposes
`init(): Promise<void>` and `getBestMove(fen, color): Promise<string | null>`. A `StockfishBot`
class implements `ChessBot` using `StockfishService` + the existing `HardBot` heuristic as
fallback. A new `StockfishLoaderComponent` wraps the bot-loading flow. The opponent-select screen
is redesigned into a tiered layout.

```
OpponentSelectComponent
  └─ user picks Engine
       └─ StockfishLoaderComponent
            ├─ first load  → Loading Screen (≥3s) → StockfishService.init()
            └─ cached      → StockfishService.init() (instant)
                               └─ uci ready → game starts
                                    └─ ChessSessionService
                                         └─ bot turn → StockfishBot.chooseMove()
                                              ├─ boardToFen()
                                              │    └─ StockfishService.getBestMove()
                                              │         └─ UCI: position fen + go movetime 500
                                              │              └─ bestmove e2e4
                                              │                   └─ uciBestMoveToIntent()
                                              │                        ├─ intent legal? → use it
                                              │                        └─ illegal?      → HardBot fallback
```

---

## Task Breakdown

### Task 1 — Serve Stockfish WASM files from `public/`

**Objective:** Get `stockfish-18-lite-single.js` + `.wasm` into `public/stockfish/` so Angular
serves them as static assets with zero build-pipeline involvement.

**Implementation:**
- Download both files from the `stockfish` npm package (or extract from `node_modules/stockfish/`)
- Place in `public/stockfish/`
- Verify they serve correctly at `/stockfish/stockfish-18-lite-single.js` via `ng serve`

**Test:** Manual check that `new Worker('/stockfish/stockfish-18-lite-single.js')` creates a
worker without errors in the browser console.

**Done when:** Files served from dev server; worker can be instantiated in browser devtools.

---

### Task 2 — `StockfishService`: UCI Worker wrapper

**Objective:** Angular service that manages a single Web Worker, speaks UCI, and exposes
`init(): Promise<void>` and `getBestMove(fen: string, thinkMs?: number): Promise<string | null>`.

**Implementation:**

```
src/app/chess/services/stockfish.service.ts
```

- `init()`: create worker, send `uci`, wait for `uciok`, send `isready`, wait for `readyok`. Track
  `isReady` signal.
- `getBestMove(fen, thinkMs = 400)`: send `position fen <fen>`, send `go movetime <thinkMs>`,
  resolve when `bestmove` line arrives. Queue requests so only one runs at a time.
- `destroy()`: terminate worker, reset state.
- `isAlreadyCached(): Promise<boolean>`: use
  `caches.match('/stockfish/stockfish-18-lite-single.js')` to detect browser cache hit.

**Tests:** Mock the Web Worker with a fake UCI responder; verify `uciok` handshake, `bestmove`
parsing, request queuing.

**Done when:** Service injects cleanly; `getBestMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1')` returns a valid UCI move string.

---

### Task 3 — FEN bridge: `boardToFen()` and `uciBestMoveToIntent()`

**Objective:** Pure utility functions converting between internal board representation and UCI
strings. No Angular dependencies.

**Implementation:**

```
src/app/chess/engine/fen-bridge.ts
```

- `boardToFen(board: Board, sideToMove: PieceColor): string`
  - Iterates 8×8 board, emits FEN piece-placement rows, appends `w/b`, `- -`, `0 1`
  - For Royale 15×15 boards: project to 8×8 first via `royaleBoardTo8x8()` — linear scale
    file/rank 0–14 → 0–7, keep only one piece per projected square (drop collisions, handled by
    fallback)
- `uciBestMoveToIntent(uciMove: string, board: Board, size: number): MoveIntent | null`
  - Parses `e2e4` / `e7e8q` format into `{ kind: 'move', from, to, promoteTo? }`
  - For Royale, reverse-projects 8×8 squares back to nearest 15×15 squares

**Tests:** Unit tests for standard-position FEN output, promotion parsing, 15×15 projection
round-trip.

**Done when:** `boardToFen(createInitialBoard(), 'white')` returns
`'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1'`.

---

### Task 4 — `StockfishBot`: `ChessBot` implementation

**Objective:** A bot that uses Stockfish for move suggestion and falls back to `HardBot` if the
suggestion is illegal in the variant or the service isn't ready.

**Implementation:**

```
src/app/chess/engine/bots/stockfish-bot.ts
```

- Implements `ChessBot` interface (`id = 'stockfish'`, `name = 'Engine'`)
- `chooseMove(position, color, engine)`:
  1. Call `StockfishService.getBestMove(boardToFen(position.board, color))`
  2. Await result, map via `uciBestMoveToIntent()`
  3. Check result exists in `engine.legalIntents(position, color)`
  4. If legal → use it. If illegal / null / timeout → delegate to `HardBot.chooseMove()`
- **Async bridging strategy:** `ChessBot.chooseMove` is synchronous. `StockfishBot` pre-fetches
  the best move immediately after the human confirms their move (while the engine resolves the
  round), stores the result `Promise`, and serves it synchronously in `chooseMove` via the stored
  resolved value. If not yet resolved → fall back to `HardBot`.
- Register in `BOT_DIFFICULTIES` in `bot.ts` as a new entry with `id: 'stockfish'`

**Tests:** Mock `StockfishService`, verify legal-move filtering and fallback path when Stockfish
returns an illegal move.

**Done when:** In a unit test, `StockfishBot.chooseMove` returns a legal intent from the engine's
legal intents list.

---

### Task 5 — `StockfishLoaderComponent`: loading screen with ≥3s minimum

**Objective:** Standalone component shown while Stockfish WASM initialises, with a chess-themed
animation and enforced minimum wait on first load.

**Implementation:**

```
src/app/chess/components/stockfish-loader/stockfish-loader.component.ts
src/app/chess/components/stockfish-loader/stockfish-loader.component.scss
```

- On mount: call `StockfishService.isAlreadyCached()`
- If **cached** → call `init()`, emit `(ready)` as soon as it resolves (no minimum wait)
- If **not cached** → run `Promise.all([service.init(), minWait(3000)])`, show animated screen:
  - Cycling chess piece glyphs: `♜ ♞ ♝ ♛ ♚ ♝ ♞ ♜`
  - Status messages: `"Loading engine…"` → `"Caching for next time…"`
  - Subtle shimmer progress bar
- After both resolve → emit `(ready)` output

**Tests:** Verify ≥3s wait when not cached; immediate resolve when cached.

**Done when:** Selecting Engine bot shows the loader for ≥3s on first load; instant on repeat
selection.

---

### Task 6 — Redesigned `OpponentSelectComponent` UI

**Objective:** Replace the flat button list with a tiered, visually grouped opponent-select screen.

**Implementation:**

```
src/app/chess/components/opponent-select/opponent-select.component.ts  (updated)
src/app/chess/components/opponent-select/opponent-select.component.scss (redesigned)
```

**Layout:**
- **Section 1 — Hotseat:** single wide card with 👥 icon
- **Section 2 — vs Bot:** 2-column CSS grid of difficulty cards:
  - Easy `🎯` — "Captures safely, mixes things up"
  - Medium `⚔️` — "Weighs hanging pieces and position"
  - Hard `💀` — "Looks a move ahead, prices in replies"
  - Engine `🤖` — "Stockfish 18 — best move every time" + `⚡ Stockfish 18` badge pill with teal-gradient border

**Behaviour:**
- Color-pick row: larger, clearer, stays when a bot is selected
- When Engine is selected and user clicks Start → show `StockfishLoaderComponent` inline; on
  `(ready)` → emit `chosen`
- All other opponents → emit `chosen` immediately on Start

**SCSS:** CSS grid for bot cards, section headings with subtle separator, card hover lift, badge pill.

**Tests:** Selecting Engine shows loader; other bots start immediately; loader `(ready)` triggers
game start.

**Done when:** Opponent-select looks visually distinct from the current flat list; Engine card
clearly stands out.

---

### Task 7 — Wire into `ChessSessionService` + integration tests

**Objective:** End-to-end wiring for both Simultaneous and Shrinking Royale modes, with pre-fetch,
fallback, and clean session lifecycle.

**Implementation:**

- `ChessSessionService.start()`: when `botId === 'stockfish'`, inject `StockfishService`; ensure
  worker is running (already initialised by loader)
- `ChessSessionService.reset()`: call `StockfishService.destroy()` to terminate the worker
- Pre-fetch (Simultaneous mode): after human confirms move, immediately call
  `StockfishService.getBestMove(currentFen)` and cache the `Promise` in `StockfishBot`
- Pre-fetch (Royale mode): bot is synchronous/immediate; pre-fetch fires after each human move

**Tests (Jasmine):**
- Full 3-round game in Simultaneous mode, verify bot always returns a legal intent
- Full 3-round game in Shrinking Royale mode, verify same
- Fallback path: mock Stockfish returning an illegal UCI move → `HardBot` result used instead
- Session `reset()` destroys the worker

**Done when:** Full playable game vs Engine bot works correctly in both modes.

---

## File Map Summary

| File | Status | Notes |
|------|--------|-------|
| `public/stockfish/stockfish-18-lite-single.js` | New | Static asset, served at runtime |
| `public/stockfish/stockfish-18-lite-single.wasm` | New | Static asset |
| `src/app/chess/engine/fen-bridge.ts` | New | Pure TS — `boardToFen`, `uciBestMoveToIntent`, `royaleBoardTo8x8` |
| `src/app/chess/engine/fen-bridge.spec.ts` | New | Unit tests |
| `src/app/chess/services/stockfish.service.ts` | New | Angular service — UCI Worker wrapper |
| `src/app/chess/services/stockfish.service.spec.ts` | New | Unit tests with mocked Worker |
| `src/app/chess/engine/bots/stockfish-bot.ts` | New | `StockfishBot implements ChessBot` |
| `src/app/chess/engine/bots/stockfish-bot.spec.ts` | New | Unit tests |
| `src/app/chess/engine/bot.ts` | Modified | Add `'stockfish'` entry to `BOT_DIFFICULTIES` |
| `src/app/chess/components/stockfish-loader/` | New | Loader component + SCSS |
| `src/app/chess/components/opponent-select/opponent-select.component.ts` | Modified | Tiered UI, Engine loader flow |
| `src/app/chess/components/opponent-select/opponent-select.component.scss` | Modified | Full redesign |
| `src/app/chess/services/chess-session.service.ts` | Modified | `StockfishService` wiring + `destroy()` on reset |
