# Implementation Plan: Math Quiz Game

## Status Summary

| Category | Done | Remaining |
|---|---|---|
| **Core implementation (Tasks 1–18)** | 18 / 18 | 0 |
| **Optional tests (Tasks marked `*`)** | 0 / 22 | 22 |
| **Dev dependency (`fast-check`)** | Not installed | 1 |

**All feature code is implemented and builds successfully.** What remains is entirely optional test coverage (property tests + a few unit tests) and manual browser smoke testing.

---

## Overview

Implement the Math Quiz Game as a set of Angular 18 standalone components and injectable services under `src/app/math-quiz/`. Tasks progress from data models → services → components → wiring → routing. Property-based tests use `fast-check` and are placed immediately after the code they validate. Unit tests use Jasmine/Karma (the project's default Angular test runner).

---

## Tasks

- [x] 1. Create folder structure and shared data models
  - Create `src/app/math-quiz/` root folder
  - Create `src/app/math-quiz/models/math-quiz.models.ts` with all types, interfaces, and constants:
    - `GameState`, `GameMode`, `Difficulty`, `AnswerType` type aliases
    - `Question`, `SessionState`, `SessionSnapshot`, `SessionResult`, `PersonalBestRecord` interfaces
    - `QUESTIONS_PER_ROUND = 10`, `TIMER_MS`, `POINTS_CORRECT = 10`, `POINTS_BONUS_SPEED = 5` constants
    - `GAME_MODE_CONFIG` and `DIFFICULTY_DESCRIPTIONS` constant maps (descriptions for all 6 modes × 3 difficulties)
  - Create `src/app/math-quiz/services/` folder
  - Create `src/app/math-quiz/components/` folder
  - _Requirements: 4.1, 4.2, 12.1, 19.1_

---

- [x] 2. Implement `PersonalBestService`
  - [x] 2.1 Create `src/app/math-quiz/services/personal-best.service.ts`
    - Inject `LocalStorageService`
    - Implement `private key(mode, difficulty): string` → `"math-quiz-best-{mode}-{difficulty}"`
    - Implement `getPersonalBest(mode, difficulty): number` — returns stored value or 0 if null
    - Implement `setPersonalBest(mode, difficulty, score): void` — writes `PersonalBestRecord` with score and ISO timestamp
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [ ]* 2.2 Write property test for PersonalBest round-trip
    - **Property 14: PersonalBest round-trip consistency**
    - For any `(GameMode, Difficulty, score)` triple, `setPersonalBest` then `getPersonalBest` returns the same score
    - Use `fc.constantFrom(...modes)`, `fc.constantFrom(...diffs)`, `fc.integer({ min: 0, max: 1000 })`
    - **Validates: Requirements 16.4, 16.5**

  - [ ]* 2.3 Write property test for PersonalBest key format
    - **Property 15: PersonalBest storage key format**
    - For any `(GameMode, Difficulty)`, the key equals `"math-quiz-best-{mode}-{difficulty}"`
    - Assert via spy on `LocalStorageService.setItem`, capture key argument
    - **Validates: Requirements 16.2**

  - [ ]* 2.4 Write unit test: getPersonalBest returns 0 when localStorage is empty
    - Mock `LocalStorageService.getItem` to return `null`
    - Assert `getPersonalBest('multiplication', 'easy') === 0`
    - _Requirements: 16.3_

---

- [x] 3. Implement `QuestionEngine` — core and Multiplication mode
  - [x] 3.1 Create `src/app/math-quiz/services/question-engine.service.ts`
    - Scaffold `QuestionEngine` with `@Injectable({ providedIn: 'root' })`
    - Implement private utilities: `randInt(min, max)`, `shuffle<T>(arr)`, uniqueness tracking (`Set<string>`)
    - Implement `generateSession(mode, difficulty): Question[]` — calls mode-specific generator in loop, enforces uniqueness
    - Implement `generateMultiplication(diff, id): Question`:
      - Easy: `n, m ∈ [1,9]`; text = `"${n} × ${m} = ?"`, `correctAnswer = String(n * m)`, `answerType = 'typed'`
      - Medium: both `∈ [1,99]`, at least one `≥ 10`
      - Hard: three operands `n, m, k ∈ [1,99]`; text = `"${n} × ${m} × ${k} = ?"`
    - _Requirements: 4.3, 5.1, 5.2, 5.3, 5.4_

  - [ ]* 3.2 Write property test: session generates exactly 10 questions
    - **Property 1: Session always generates exactly QUESTIONS_PER_ROUND questions**
    - `fc.record({ mode: fc.constantFrom(...), difficulty: fc.constantFrom(...) })`
    - Assert `questions.length === 10`
    - **Validates: Requirements 4.3**

  - [ ]* 3.3 Write property test: multiplication operand bounds
    - **Property 2: Multiplication question operands are within specified bounds**
    - Parse operands from `question.text`, assert per-difficulty range rules
    - Test all 3 difficulties with `fc.constantFrom('easy','medium','hard')`
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [ ]* 3.4 Write property test: session question texts are unique
    - **Property 9: Session question texts are unique within a session**
    - Generate a session for each `(mode, difficulty)` pair; assert `new Set(texts).size === 10`
    - **Validates: Requirements 5.4**

---

- [x] 4. Implement `QuestionEngine` — Division, Mixed Operations
  - [x] 4.1 Add `generateDivision(diff, id): Question`
    - Easy: choose `m ∈ [1,9]`, `q ∈ [1,9]`, `n = m * q`; text = `"${n} ÷ ${m} = ?"`; `correctAnswer = String(q)`; rejection loop guards `m ≠ 0`
    - Medium: choose `n, m ∈ [1,999]`; compute result; if result rounds to one decimal store as string (e.g. `"2.5"`); else retry
    - Hard: choose `n, m ∈ [1,9999]`; text includes "Round to nearest integer"; `correctAnswer = String(Math.round(n / m))`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 4.2 Write property test: division correctness and no zero divisor
    - **Property 3: Division question never has zero divisor and correctAnswer matches arithmetic**
    - Parse `n`, `m` from text for each difficulty; assert divisor ≠ 0 and correctAnswer formula
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

  - [x] 4.3 Add `generateMixed(diff, id): Question`
    - Easy: `OP ∈ {'+', '-'}`, operands `[1,20]`; evaluate; `answerType = 'typed'`
    - Medium: `OP ∈ {'+', '-', '×', '÷'}`, operands `[1,100]`; for `÷` ensure integer result via `n = m * q`
    - Hard: three operands `[1,1000]`, two operators, respects standard precedence; for any division sub-expression guarantee integer intermediate/final; evaluate using JS arithmetic (not `new Function`); build AST manually: `(a OP1 b) OP2 c` with precedence-aware computation
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 4.4 Write property test: mixed operations PEMDAS
    - **Property 4: Mixed operations correct answer equals evaluated expression with PEMDAS**
    - Extract operands and operators from text; compute expected with standard precedence; compare to `correctAnswer`
    - **Validates: Requirements 7.1, 7.2, 7.3**

---

- [x] 5. Implement `QuestionEngine` — Power & Roots, Sequence
  - [x] 5.1 Add `generatePowerRoots(diff, id): Question`
    - Easy: `n ∈ [1,12]`; text = `"${n}² = ?"`; `correctAnswer = String(n * n)`
    - Medium: randomly pick squares (`n ∈ [1,10]`, text = `"${n}³ = ?"`) or sqrt (pick `n ∈ [1,12]`, p = n², text = `"√${p} = ?"`)
    - Hard: randomly pick cbrt (pick perfect cube `p ∈ [1,1000]`, `n = ∛p`, text = `"∛${p} = ?"`) or n^4/5 (`n ∈ [2,9]`, `k ∈ {4,5}`, text = `"${n}^${k} = ?"`)
    - Use Unicode: `²` U+00B2, `³` U+00B3, `⁴` U+2074, `⁵` U+2075, `√` U+221A, `∛` U+221B
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 5.2 Write property test: Power & Roots correctAnswer matches operation
    - **Property 5: Power & Roots correct answer matches the displayed operation**
    - Detect operation type from text, compute expected, compare
    - **Validates: Requirements 8.1, 8.2, 8.3**

  - [x] 5.3 Add `generateSequence(diff, id): Question`
    - Easy: generate arithmetic sequence `[a, a+d, a+2d, a+3d, a+4d]`, `a ∈ [1,20]`, `d ∈ [1,10]`; pick random blank position; generate 3 distractors using `±d, ±2d, ±3d` offsets; shuffle options
    - Medium: generate geometric sequence `[a, a*r, a*r², a*r³, a*r⁴]`, `r ∈ {2,3,0.5}` (keep as integers where possible); blank one element; generate 3 distractors; shuffle
    - Hard: randomly pick Fibonacci-like (6 terms: `a,b,a+b,...`) or alternating-step (step alternates between `d1,d2`); blank one element; guarantee at least one distractor is `correct ± 1`; shuffle; `answerType = 'multiple-choice'`
    - `question.options` stores string representations of all 4 options
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 5.4 Write property test: sequence correct answer fills blank validly
    - **Property 7: Sequence correct answer fills the blank to satisfy the sequence rule**
    - Reconstruct full sequence, validate arithmetic/geometric/Fibonacci/alternating rule
    - **Validates: Requirements 9.1, 9.2, 9.3**

  - [ ]* 5.5 Write property test: MC options are 4 distinct with correct appearing once
    - **Property 6: Multiple-choice questions have exactly 4 distinct options containing correct answer exactly once**
    - Generate MC questions for sequence and estimation; assert Set size 4 and single correct occurrence
    - **Validates: Requirements 9.4, 9.5**

---

- [x] 6. Implement `QuestionEngine` — Mental Estimation
  - [x] 6.1 Add `generateEstimation(diff, id): Question`
    - Easy: `a,b ∈ [1,50]`, true value `T = a * b`
    - Medium: randomly `(a×b)+c` or `(a+b)×c`, all `∈ [1,200]`
    - Hard: `(a×b)−(c×d)`, all `∈ [1,500]`
    - Correct option: nearest integer within 10% of T
    - Distractor generation rejection loop: candidate must satisfy `|c - T| / T >= 0.15` and be distinct from all other options and be a positive integer
    - `answerType = 'multiple-choice'`; shuffle 4 options
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 6.2 Write property test: estimation proximity constraints
    - **Property 8: Estimation options satisfy proximity constraints**
    - Compute true value T; assert correct option |diff|/T ≤ 0.10; assert all distractors |diff|/T ≥ 0.15
    - **Validates: Requirements 10.1, 10.2, 10.3**

- [x] 7. Checkpoint — ensure all QuestionEngine tests pass
  - Build verified via `ng build` (property tests skipped — optional MVP)

---

- [x] 8. Implement `SessionService`
  - [x] 8.1 Create `src/app/math-quiz/services/session.service.ts`
    - Scaffold with `signal<SessionState | null>(null)`
    - Implement `initSession(mode, difficulty, questions, personalBest): void` — sets all fields from requirements
    - Implement `startTimer(): () => void` — 16 ms interval, decrements `timerRemainingMs`, calls `expireQuestion()` at 0; returns `clearInterval` wrapper
    - Implement `submitAnswer(answer: string): boolean` — trims, compares numeric (with ±0.05 tolerance for division medium), updates `score`, `correctCount`, `questionTimings`; calls `SoundService.playCorrect/Wrong`; returns whether correct
    - Implement `expireQuestion(): void` — records 0 points, calls `playWrong`, records elapsed time
    - Implement `advanceQuestion(): void` — increments `questionIndex`, resets `timerRemainingMs` to `TIMER_MS[difficulty]`
    - Implement `getResult(currentPersonalBest: number): SessionResult` — computes `accuracy`, `averageTimingMs`, `isNewPersonalBest`
    - _Requirements: 4.1, 4.4, 12.1, 12.3, 12.4, 13.1, 13.2, 13.3, 13.4, 13.5, 15.1, 17.1, 17.2_

  - [ ]* 8.2 Write property test: correct answer increments score by 10 (+5 if within timer)
    - **Property 10: Correct answer submission increases score by exactly 10 (+ 5 if within timer)**
    - Generate arbitrary session state; inject mock question with known correct answer; assert score delta
    - Use `fc.integer({ min: 0, max: 150 })` for initial score, `fc.boolean()` for timer-remaining state
    - **Validates: Requirements 13.1, 13.2**

  - [ ]* 8.3 Write property test: incorrect answer does not change score
    - **Property 11: Incorrect answer submission does not change the score**
    - Generate session state; submit wrong answer string; assert score unchanged
    - **Validates: Requirements 13.3**

  - [ ]* 8.4 Write property test: typed answer whitespace tolerance
    - **Property 12: Typed answer comparison is whitespace-tolerant**
    - `fc.string()` with prepended/appended spaces; compare result to same string trimmed
    - **Validates: Requirements 13.5**

  - [ ]* 8.5 Write property test: results accuracy formula
    - **Property 13: Results accuracy equals correctCount / 10 × 100**
    - `fc.integer({ min: 0, max: 10 })` for correctCount; assert `result.accuracy === correctCount / 10 * 100`
    - **Validates: Requirements 15.1**

---

- [x] 9. Implement `TimerBarComponent`
  - [x] Create `src/app/math-quiz/components/timer-bar/timer-bar.component.ts`
  - [x] Inputs: `@Input() remainingMs: number`, `@Input() totalMs: number`
  - [x] Template: progressbar with aria attributes, width %, color class
  - [x] Computed `pct` and `colorClass` (green >50%, orange 20–50%, red <20%)
  - [x] Styles in `timer-bar.component.scss`
  - _Requirements: 12.2, 12.5, 18.5_

  - [ ]* 9.1 Write unit test: TimerBarComponent color class at thresholds
    - Test pct > 50 → `timer-green`, pct = 35 → `timer-orange`, pct = 10 → `timer-red`
    - _Requirements: 12.5_

---

- [x] 10. Implement `TypedAnswerComponent` and `MultipleChoiceComponent`
  - [x] 10.1 Create `src/app/math-quiz/components/typed-answer/typed-answer.component.ts`
    - Template: `<input #answerInput type="text" [(ngModel)]="value" (keyup.enter)="submit()" [disabled]="disabled" />` + Submit button
    - `ngAfterViewInit`: `answerInput.nativeElement.focus()`
    - `submit()`: emit `answered` with current value, clear `value`
    - Import `FormsModule`
    - _Requirements: 11.5, 11.7, 18.3_

  - [x] 10.2 Create `src/app/math-quiz/components/multiple-choice/multiple-choice.component.ts`
    - Template: `@for (opt of options) { <button [attr.aria-label]="'Answer: ' + opt" (click)="select(opt)" [disabled]="disabled">{{ opt }}</button> }`
    - Emit `answered` with selected option
    - _Requirements: 11.6, 18.4_

---

- [x] 11. Implement `FeedbackOverlayComponent`
  - [x] Create `src/app/math-quiz/components/feedback-overlay/feedback-overlay.component.ts`
  - [x] Inputs/outputs, auto-advance timeout, ngOnDestroy cleanup
  - [x] Template: ✅/❌ icon, correct answer on wrong, "Next" button
  - _Requirements: 14.1, 14.2, 14.3, 14.4_

---

- [x] 12. Implement `GameScreenComponent`
  - [x] Create `src/app/math-quiz/components/game-screen/game-screen.component.ts`
  - [x] All inputs/outputs wired
  - [x] Template: counter, score, timer bar, question text, typed/MC answer, feedback overlay
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 14.5_

---

- [x] 13. Implement `ModeSelectComponent` and `DifficultySelectComponent`
  - [x] 13.1 Create `src/app/math-quiz/components/mode-select/mode-select.component.ts`
    - Output: `@Output() modeSelected = new EventEmitter<GameMode>()`
    - Iterate over `Object.entries(GAME_MODE_CONFIG)` to render 6 cards
    - Each card: icon, name, description; emit `modeSelected` on click
    - CSS grid layout that reflows to single column at ≤ 480 px
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 18.2_

  - [x] 13.2 Create `src/app/math-quiz/components/difficulty-select/difficulty-select.component.ts`
    - Input: `@Input() mode: GameMode`
    - Outputs: `@Output() difficultySelected = new EventEmitter<Difficulty>()`, `@Output() back = new EventEmitter<void>()`
    - Render 3 cards using `DIFFICULTY_DESCRIPTIONS[mode][diff]` and `TIMER_MS[diff] / 1000` seconds
    - Back button emits `back`
    - _Requirements: 3.1, 3.2, 3.4_

---

- [x] 14. Implement `ResultsComponent`
  - [x] Create `src/app/math-quiz/components/results/results.component.ts`
  - [x] Display score, accuracy, avg time, mode, difficulty, personal best
  - [x] New personal best badge, Play Again / Change Mode buttons
  - _Requirements: 15.1, 15.3, 15.4, 15.5, 15.6_

---

- [x] 15. Implement `MathQuizGameComponent` (host + state machine)
  - [x] Create `src/app/math-quiz/math-quiz-game.component.ts`
  - [x] Inject QuestionEngine, SessionService, PersonalBestService, SoundService
  - [x] State signals + computed currentQuestion / sessionSnapshot
  - [x] All event handlers (mode, difficulty, answer, timer, next, play again, change mode)
  - [x] `@switch` template for all GameState values
  - [x] Invalid transition guards + ngOnDestroy timer cleanup
  - _Requirements: 3.3, 3.5, 4.4, 12.3, 12.4, 15.2, 15.3, 15.5, 15.6, 19.1, 19.2, 19.3, 19.4_

  - [ ]* 15.1 Write property test: state machine valid transitions
    - **Property 16: State machine valid transitions**
    - Enumerate all valid `(fromState, action)` → `expectedNextState` triples from Requirements 19.2
    - Call the transition handler, assert `gameState()` equals expected
    - Also test one invalid transition per state: assert state unchanged
    - **Validates: Requirements 19.2**

  - [ ]* 15.2 Write property test: question counter stays within [1, 10]
    - **Property 17: Question counter display is always within [1, 10]**
    - `fc.integer({ min: 0, max: 9 })` for questionIndex; assert rendered counter is `"{n} / 10"` with `n ∈ [1,10]`
    - **Validates: Requirements 11.2**

---

- [x] 16. Add stylesheet for `MathQuizGameComponent` and shared quiz styles
  - [x] Create `src/app/math-quiz/math-quiz-game.component.scss`
  - [x] Add `$color-math-quiz: #f97316` to `_colors.scss`
  - [x] Card grids, timer bar colors, hover effects, feedback overlay, new-best badge animation
  - _Requirements: 18.1, 18.2, 18.6_

---

- [x] 17. Register route and `GameRouteService` entry
  - [x] Route `{ path: 'math-quiz', component: MathQuizGameComponent }` in `app.routes.ts`
  - [x] `{ name: 'Math Quiz', route: '/math-quiz', color: '#f97316' }` in `GameRouteService`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 20.6_

  - [ ]* 17.1 Write unit test: GameRouteService includes math-quiz entry
    - Assert `getGames()` contains entry with `route === '/math-quiz'`
    - _Requirements: 1.2_

---

- [x] 18. Checkpoint — full integration smoke test
  - [x] `ng build` passes with no compilation errors
  - [ ] Manual browser walkthrough (lobby → mode → difficulty → play → results → play again)
  - [ ] `ng test --run` (no math-quiz spec files exist yet)

---

## Remaining Work (optional tests only)

All items below are marked `*` in the task list — optional for MVP:

| Task | Description |
|---|---|
| 2.2 | Property 14: PersonalBest round-trip |
| 2.3 | Property 15: PersonalBest key format |
| 2.4 | Unit test: getPersonalBest returns 0 when empty |
| 3.2 | Property 1: Session generates exactly 10 questions |
| 3.3 | Property 2: Multiplication operand bounds |
| 3.4 | Property 9: Session question texts unique |
| 4.2 | Property 3: Division correctness, no zero divisor |
| 4.4 | Property 4: Mixed operations PEMDAS |
| 5.2 | Property 5: Power & Roots correctAnswer |
| 5.4 | Property 7: Sequence blank fill validity |
| 5.5 | Property 6: MC options 4 distinct, correct once |
| 6.2 | Property 8: Estimation proximity constraints |
| 8.2 | Property 10: Correct answer score increment |
| 8.3 | Property 11: Incorrect answer no score change |
| 8.4 | Property 12: Typed answer whitespace tolerance |
| 8.5 | Property 13: Results accuracy formula |
| 9.1 | Unit test: TimerBarComponent color thresholds |
| 15.1 | Property 16: State machine valid transitions |
| 15.2 | Property 17: Question counter within [1, 10] |
| 17.1 | Unit test: GameRouteService includes math-quiz |

**Prerequisite:** `npm install --save-dev fast-check` (not yet installed)

---

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use `fast-check` (`npm install --save-dev fast-check`)
- Each property test references the design document property number in a comment: `// Feature: math-quiz-game, Property N: ...`
- Minimum 100 iterations per `fc.assert(fc.property(...))` call (fast-check default is 100)
- `SessionService` uses Angular signals for reactive state binding to components
- The `timerCleanup` pattern prevents memory leaks from `setInterval` across navigation
- Division medium tolerance (±0.05) is stored as `question.tolerance` field (add to `Question` interface in Task 1)
- All components import only `CommonModule`, `FormsModule`, or other math-quiz components — no new external libraries
