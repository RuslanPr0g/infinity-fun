# Requirements Document

## Introduction

The Math Quiz Game is a standalone Angular 18 mini-game accessible at `/math-quiz`. Players select one of six game modes and one of three difficulty levels, then answer 10 questions per round. The game tracks score, accuracy, and per-question timing, persists personal bests to localStorage, plays audio feedback via the existing `SoundService`, and is navigable from the home screen via `GameRouteService`.

The six game modes are: Multiplication, Division, Mixed Operations, Power & Roots, Number Sequence, and Mental Estimation.

---

## Glossary

- **MathQuizGame**: The Angular feature located at `/math-quiz`.
- **QuestionEngine**: The service responsible for generating questions for all modes and difficulties.
- **SessionService**: The service that manages active session state (score, timer, question index).
- **PersonalBestService**: The service that reads and writes personal-best records to localStorage.
- **GameState**: An enum/union type representing the current phase: `lobby | mode-select | difficulty-select | playing | feedback | results`.
- **GameMode**: One of `multiplication | division | mixed | power-roots | sequence | estimation`.
- **Difficulty**: One of `easy | medium | hard`.
- **Question**: A data object containing the question text, expected answer, answer type (typed | multiple-choice), and optional multiple-choice options.
- **Session**: A single round of 10 questions for a chosen mode and difficulty.
- **PersonalBest**: The highest score achieved for a specific `(GameMode, Difficulty)` pair, stored in localStorage.
- **TimerBar**: A visual countdown bar that decreases from full to empty within the allotted time.
- **FeedbackPhase**: The brief state after submitting an answer where correct/incorrect feedback and the correct answer are shown.
- **SoundService**: Existing shared service with `playCorrect()` and `playWrong()` methods.
- **LocalStorageService**: Existing shared service for typed localStorage read/write.
- **GameRouteService**: Existing shared service that returns the list of games displayed on the home screen.

---

## Requirements

---

### Requirement 1: Route and Navigation Registration

**User Story:** As a player, I want to access the Math Quiz Game from the home screen and by navigating to `/math-quiz`, so that the game is reachable like all other games.

#### Acceptance Criteria

1. THE MathQuizGame SHALL be registered at path `math-quiz` in `app.routes.ts`.
2. THE GameRouteService SHALL include an entry for Math Quiz Game with `route: '/math-quiz'` and a distinct color.
3. WHEN a user navigates to `/math-quiz`, THE MathQuizGame SHALL render the lobby screen.
4. WHEN a user navigates to any unknown path, THE Router SHALL redirect to the home screen (existing wildcard rule preserved).

---

### Requirement 2: Lobby — Mode Selection Screen

**User Story:** As a player, I want to see all six game modes as selectable cards so that I can choose how I want to be challenged.

#### Acceptance Criteria

1. WHEN the MathQuizGame loads at `GameState.lobby`, THE ModeSelectComponent SHALL display exactly 6 mode cards.
2. THE ModeSelectComponent SHALL display each card with: mode name, a brief one-sentence description, and a representative icon or emoji.
3. WHEN a player clicks a mode card, THE MathQuizGame SHALL transition `GameState` to `difficulty-select` and record the selected `GameMode`.
4. THE ModeSelectComponent SHALL highlight the currently focused/hovered card with a distinct visual state.
5. IF no mode is selected, THEN THE DifficultySelectComponent SHALL NOT be rendered.

---

### Requirement 3: Lobby — Difficulty Selection Screen

**User Story:** As a player, I want to pick Easy, Medium, or Hard for my chosen mode, with a description of what each difficulty entails, so that I can calibrate the challenge.

#### Acceptance Criteria

1. WHEN `GameState` is `difficulty-select`, THE DifficultySelectComponent SHALL display exactly 3 difficulty cards: Easy, Medium, Hard.
2. THE DifficultySelectComponent SHALL display on each card: the difficulty label, a description specific to the selected `GameMode`, and the time limit per question (Easy: 30 s, Medium: 20 s, Hard: 15 s).
3. WHEN a player clicks a difficulty card, THE MathQuizGame SHALL transition `GameState` to `playing`, initialise a new `Session`, and generate the first `Question`.
4. THE DifficultySelectComponent SHALL provide a back button that transitions `GameState` to `lobby`.
5. WHEN the player navigates back to `lobby`, THE selected `GameMode` SHALL be cleared.

---

### Requirement 4: Session Initialisation

**User Story:** As the system, I want to initialise a clean session for each new round so that score and state do not bleed between rounds.

#### Acceptance Criteria

1. WHEN a new `Session` is initialised, THE SessionService SHALL set `score` to 0, `questionIndex` to 0, `correctCount` to 0, and `questionTimings` to an empty array.
2. THE SessionService SHALL set `questionsPerRound` to 10 (configurable constant).
3. THE QuestionEngine SHALL pre-generate all 10 `Question` objects at session start.
4. WHEN a `Session` is initialised, THE SessionService SHALL load the existing `PersonalBest` for the current `(GameMode, Difficulty)` pair.

---

### Requirement 5: Question Generation — Multiplication Mode

**User Story:** As a player in Multiplication mode, I want numeric multiplication problems generated according to difficulty so that I practise mental multiplication.

#### Acceptance Criteria

1. WHEN `GameMode` is `multiplication` and `Difficulty` is `easy`, THE QuestionEngine SHALL generate a question of the form `n × m` where both `n` and `m` are integers in [1, 9], answer type is `typed`.
2. WHEN `GameMode` is `multiplication` and `Difficulty` is `medium`, THE QuestionEngine SHALL generate a question of the form `n × m` where at least one of `n`, `m` is in [10, 99] and both are in [1, 99], answer type is `typed`.
3. WHEN `GameMode` is `multiplication` and `Difficulty` is `hard`, THE QuestionEngine SHALL generate a question of the form `n × m × k` where all three operands are integers in [1, 99], answer type is `typed`.
4. THE QuestionEngine SHALL ensure no duplicate questions appear within the same `Session` for Multiplication mode.

---

### Requirement 6: Question Generation — Division Mode

**User Story:** As a player in Division mode, I want division problems appropriate to my difficulty level so that I practise numeric division.

#### Acceptance Criteria

1. WHEN `GameMode` is `division` and `Difficulty` is `easy`, THE QuestionEngine SHALL generate `n ÷ m` where `m` ∈ [1, 9], `n` = `m × q` for integer `q` ∈ [1, 9], result is a positive integer, answer type is `typed`.
2. WHEN `GameMode` is `division` and `Difficulty` is `medium`, THE QuestionEngine SHALL generate `n ÷ m` where both are integers up to 999, the result may include exactly one decimal place (e.g. 2.5), answer type is `typed`.
3. WHEN `GameMode` is `division` and `Difficulty` is `hard`, THE QuestionEngine SHALL generate `n ÷ m` where both are integers up to 9999; the displayed question SHALL instruct the player to round to the nearest integer; answer type is `typed`; the accepted answer is `Math.round(n / m)`.
4. IF `m` equals 0, THEN THE QuestionEngine SHALL regenerate the question to avoid division by zero.

---

### Requirement 7: Question Generation — Mixed Operations Mode

**User Story:** As a player in Mixed Operations mode, I want arithmetic problems using multiple operators so that I practise combining operations.

#### Acceptance Criteria

1. WHEN `GameMode` is `mixed` and `Difficulty` is `easy`, THE QuestionEngine SHALL generate `a OP b` where `OP` ∈ {+, −}, both `a, b` ∈ [1, 20], answer type is `typed`.
2. WHEN `GameMode` is `mixed` and `Difficulty` is `medium`, THE QuestionEngine SHALL generate `a OP b` where `OP` ∈ {+, −, ×, ÷}, both `a, b` ∈ [1, 100]; for division, the engine SHALL guarantee integer results, answer type is `typed`.
3. WHEN `GameMode` is `mixed` and `Difficulty` is `hard`, THE QuestionEngine SHALL generate `a OP1 b OP2 c` where `OP1, OP2` ∈ {+, −, ×, ÷}, all operands ∈ [1, 1000], and THE engine SHALL evaluate the expression respecting standard operator precedence (PEMDAS); for divisions the engine SHALL guarantee integer intermediate and final results, answer type is `typed`.
4. IF a generated expression would produce a non-integer result in `hard` or `easy` difficulty for division sub-expressions, THEN THE QuestionEngine SHALL regenerate.

---

### Requirement 8: Question Generation — Power & Roots Mode

**User Story:** As a player in Power & Roots mode, I want exponent and root problems so that I practise powers and square/cube roots.

#### Acceptance Criteria

1. WHEN `GameMode` is `power-roots` and `Difficulty` is `easy`, THE QuestionEngine SHALL generate `n²` where `n` ∈ [1, 12], answer type is `typed`.
2. WHEN `GameMode` is `power-roots` and `Difficulty` is `medium`, THE QuestionEngine SHALL randomly generate either `n³` where `n` ∈ [1, 10], or `√p` where `p` is a perfect square in [1, 144], answer type is `typed`.
3. WHEN `GameMode` is `power-roots` and `Difficulty` is `hard`, THE QuestionEngine SHALL randomly generate either `∛p` where `p` is a perfect cube in [1, 1000], or `nᵏ` where `n` ∈ [2, 9] and `k` ∈ {4, 5}, answer type is `typed`.
4. THE QuestionEngine SHALL display `√`, `∛`, `²`, `³`, `⁴`, `⁵` as proper Unicode superscript/radical symbols in the question text.

---

### Requirement 9: Question Generation — Number Sequence Mode

**User Story:** As a player in Number Sequence mode, I want to complete patterns in a sequence so that I practise recognising arithmetic and geometric progressions.

#### Acceptance Criteria

1. WHEN `GameMode` is `sequence` and `Difficulty` is `easy`, THE QuestionEngine SHALL generate an arithmetic sequence of 5 numbers (step size ∈ [1, 10]) with one element replaced by a blank; answer type is `multiple-choice` with exactly 4 options.
2. WHEN `GameMode` is `sequence` and `Difficulty` is `medium`, THE QuestionEngine SHALL generate a geometric sequence of 5 numbers (ratio ∈ {×2, ×3, ×0.5, ÷2}) with one element replaced by a blank; answer type is `multiple-choice` with exactly 4 options.
3. WHEN `GameMode` is `sequence` and `Difficulty` is `hard`, THE QuestionEngine SHALL generate either a Fibonacci-like sequence (each term = sum of the two preceding) or an alternating-step sequence (step alternates between two values) of 6 numbers with one blank; answer type is `multiple-choice` with exactly 4 options; at least one distractor SHALL differ from the correct answer by exactly 1.
4. THE QuestionEngine SHALL guarantee the correct answer appears exactly once among the 4 options.
5. THE QuestionEngine SHALL guarantee all 4 options are distinct.

---

### Requirement 10: Question Generation — Mental Estimation Mode

**User Story:** As a player in Mental Estimation mode, I want to choose the closest approximate answer so that I practise numerical estimation.

#### Acceptance Criteria

1. WHEN `GameMode` is `estimation` and `Difficulty` is `easy`, THE QuestionEngine SHALL generate `a × b` where `a, b` ∈ [1, 50]; answer type is `multiple-choice` with 4 options; the correct option SHALL be within 10% of the true value; all distractors SHALL differ from the true value by at least 15%.
2. WHEN `GameMode` is `estimation` and `Difficulty` is `medium`, THE QuestionEngine SHALL generate `(a × b) + c` or `(a + b) × c` where all operands ∈ [1, 200]; answer type is `multiple-choice` with 4 options; same 10%/15% proximity rules apply.
3. WHEN `GameMode` is `estimation` and `Difficulty` is `hard`, THE QuestionEngine SHALL generate `(a × b) − (c × d)` where all operands ∈ [1, 500]; answer type is `multiple-choice` with 4 options; same 10%/15% proximity rules apply.
4. THE QuestionEngine SHALL guarantee the correct option (closest to true value) is unique among the 4 options.
5. THE QuestionEngine SHALL guarantee all 4 options are distinct positive integers.

---

### Requirement 11: Game Screen — Question Display

**User Story:** As a player, I want to see the current question clearly along with my progress indicators so that I know where I am in the round.

#### Acceptance Criteria

1. WHEN `GameState` is `playing`, THE GameScreenComponent SHALL display the current question text.
2. THE GameScreenComponent SHALL display a question counter in the format `Q / 10` (e.g. `3 / 10`).
3. THE GameScreenComponent SHALL display the current score.
4. THE GameScreenComponent SHALL display the `TimerBar` showing remaining time for the current question.
5. WHEN the answer type is `typed`, THE GameScreenComponent SHALL render a text input field and a submit button.
6. WHEN the answer type is `multiple-choice`, THE GameScreenComponent SHALL render exactly 4 answer buttons, each showing one option.
7. THE GameScreenComponent SHALL focus the text input automatically when a new typed question is displayed.

---

### Requirement 12: Timer Behaviour

**User Story:** As a player, I want a visible countdown timer per question so that I am challenged to answer quickly.

#### Acceptance Criteria

1. WHEN a new question is shown, THE SessionService SHALL start a countdown timer set to: Easy = 30 s, Medium = 20 s, Hard = 15 s.
2. THE TimerBarComponent SHALL visually represent remaining time as a proportional fill (100% full at start, 0% at expiry).
3. WHEN the timer reaches 0, THE SessionService SHALL treat the question as unanswered, record 0 points and 0 bonus for that question, play `playWrong()`, and advance to the next question (or results if last question).
4. WHEN the player submits an answer before the timer expires, THE SessionService SHALL stop the timer.
5. THE TimerBarComponent SHALL change colour from green (>50% remaining) to orange (20–50%) to red (<20%) to communicate urgency.

---

### Requirement 13: Answer Submission and Scoring

**User Story:** As a player, I want to submit an answer and immediately know if I was right or wrong, with my score updated accordingly.

#### Acceptance Criteria

1. WHEN a player submits an answer and it is correct, THE SessionService SHALL add 10 points to `score`, increment `correctCount`, and invoke `SoundService.playCorrect()`.
2. WHEN a player submits an answer and it is correct AND the timer has not expired, THE SessionService SHALL add an additional 5 bonus points.
3. WHEN a player submits an answer and it is incorrect, THE SessionService SHALL add 0 points and invoke `SoundService.playWrong()`.
4. WHEN a player submits an answer, THE SessionService SHALL record the elapsed time for that question in `questionTimings`.
5. WHEN a player submits a `typed` answer, THE SessionService SHALL trim whitespace and compare the numeric value; tolerance is ±0 (exact integer match) except for Division medium where answers within ±0.05 of the expected one-decimal answer are accepted.
6. WHEN a player submits an answer, THE MathQuizGame SHALL transition `GameState` to `feedback`.

---

### Requirement 14: Feedback Phase

**User Story:** As a player, I want brief feedback after each answer so that I can learn from mistakes before moving on.

#### Acceptance Criteria

1. WHEN `GameState` is `feedback`, THE FeedbackComponent SHALL display whether the answer was correct or incorrect.
2. IF the answer was incorrect, THEN THE FeedbackComponent SHALL display the correct answer.
3. THE FeedbackComponent SHALL show a "Next" button; WHEN clicked, THE MathQuizGame SHALL advance to the next question and transition `GameState` to `playing`, OR transition to `results` if 10 questions have been answered.
4. THE FeedbackComponent SHALL auto-advance after 2 seconds if the player does not press "Next".
5. WHEN `GameState` transitions to `feedback`, THE TimerBar SHALL be frozen at its current value.

---

### Requirement 15: Results Screen

**User Story:** As a player, I want to see my performance summary after completing a round so that I can track my progress.

#### Acceptance Criteria

1. WHEN all 10 questions have been answered and `GameState` transitions to `results`, THE ResultsComponent SHALL display: total score, accuracy percentage (correctCount / 10 × 100), average time per question (mean of `questionTimings`), and the mode and difficulty played.
2. THE PersonalBestService SHALL compare `score` to the stored `PersonalBest` for the current `(GameMode, Difficulty)` pair.
3. IF `score` exceeds the stored `PersonalBest`, THEN THE PersonalBestService SHALL update the stored value and THE ResultsComponent SHALL display a "New Personal Best!" badge.
4. THE ResultsComponent SHALL display the current `PersonalBest` for the played `(GameMode, Difficulty)` pair.
5. THE ResultsComponent SHALL provide a "Play Again" button that re-initialises a `Session` with the same mode and difficulty and transitions `GameState` back to `playing`.
6. THE ResultsComponent SHALL provide a "Change Mode" button that transitions `GameState` to `lobby`.

---

### Requirement 16: Personal Best Persistence

**User Story:** As a player, I want my best score per mode and difficulty remembered between sessions so that I have a long-term goal.

#### Acceptance Criteria

1. THE PersonalBestService SHALL use `LocalStorageService` to persist personal bests.
2. THE PersonalBestService SHALL store personal bests under the key `math-quiz-best-{mode}-{difficulty}` (e.g. `math-quiz-best-multiplication-easy`).
3. WHEN `LocalStorageService.getItem` returns `null` for a key, THE PersonalBestService SHALL treat the personal best as 0.
4. THE PersonalBestService SHALL expose a `getPersonalBest(mode: GameMode, difficulty: Difficulty): number` method.
5. THE PersonalBestService SHALL expose a `setPersonalBest(mode: GameMode, difficulty: Difficulty, score: number): void` method.

---

### Requirement 17: Sound Feedback

**User Story:** As a player, I want audio cues for correct and incorrect answers so that the game feels responsive.

#### Acceptance Criteria

1. WHEN a correct answer is submitted, THE SessionService SHALL call `SoundService.playCorrect()` exactly once.
2. WHEN an incorrect answer is submitted or the timer expires, THE SessionService SHALL call `SoundService.playWrong()` exactly once.
3. THE MathQuizGame SHALL inject `SoundService` from the existing shared service without re-declaring it.

---

### Requirement 18: Responsive and Accessible UI

**User Story:** As a player on any device, I want the game to be usable on both desktop and mobile screens and to be keyboard-navigable.

#### Acceptance Criteria

1. THE GameScreenComponent SHALL be usable on screens as narrow as 360 px without horizontal scrolling.
2. THE ModeSelectComponent card grid SHALL reflow from multi-column (desktop) to single-column (mobile ≤ 480 px) layout.
3. WHEN the answer type is `typed`, THE player SHALL be able to submit by pressing Enter.
4. WHEN answer buttons are displayed (multiple-choice), EACH button SHALL have an accessible `aria-label` containing the option value.
5. THE TimerBarComponent SHALL include an `aria-valuenow`, `aria-valuemin`, `aria-valuemax` role for assistive technology.
6. THE MathQuizGame SHALL follow the existing dark theme (`$primary-bg-color: #121212`, `$primary-text-color: #f0f0f0`) from `_colors.scss`.

---

### Requirement 19: Internal State Machine

**User Story:** As a developer, I want the game's UI phases managed by an explicit state machine so that transitions are predictable and testable.

#### Acceptance Criteria

1. THE MathQuizGameComponent SHALL maintain a `gameState: GameState` signal or property.
2. THE valid `GameState` transitions SHALL be: `lobby` → `difficulty-select` (on mode select); `difficulty-select` → `lobby` (on back); `difficulty-select` → `playing` (on difficulty select); `playing` → `feedback` (on answer submit or timer expiry); `feedback` → `playing` (on next question); `feedback` → `results` (on last question answered); `results` → `playing` (on play again); `results` → `lobby` (on change mode).
3. THE MathQuizGameComponent SHALL use `@if` / `@switch` (Angular 17+ control flow) to render child components based on `gameState`.
4. IF an invalid state transition is attempted, THEN THE MathQuizGameComponent SHALL log a warning and remain in the current state.

---

### Requirement 20: Angular Architecture Constraints

**User Story:** As a developer, I want the feature to follow the project's existing conventions so that it is maintainable and consistent.

#### Acceptance Criteria

1. THE MathQuizGame SHALL be implemented as Angular 18 standalone components with no NgModule declarations.
2. ALL components SHALL be located under `src/app/math-quiz/`.
3. THE feature SHALL use only `FormsModule` or `ReactiveFormsModule` for form inputs; no new third-party libraries SHALL be introduced.
4. THE QuestionEngine and SessionService SHALL be injectable services decorated with `@Injectable({ providedIn: 'root' })`.
5. THE MathQuizGameComponent SHALL use the `SoundService` and `LocalStorageService` from `src/app/shared/services/` without modification.
6. WHEN the route `/math-quiz` is added to `app.routes.ts`, THE existing wildcard redirect rule SHALL remain the last entry.
