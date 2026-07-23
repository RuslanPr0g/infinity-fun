# Spec: Math Quiz Game

Feature spec for the Math Quiz Game (`/math-quiz`), implemented under `src/app/math-quiz/`.
Migrated from the former Kiro spec workflow (requirements-first).

| Document | Purpose |
|---|---|
| [`requirements.md`](./requirements.md) | User stories + numbered acceptance criteria (EARS-style). |
| [`design.md`](./design.md) | Architecture, component/service interfaces, data models, correctness properties, testing strategy. |
| [`tasks.md`](./tasks.md) | Implementation plan and status. Core implementation is complete; remaining items are optional property/unit tests. |

Status: feature implemented and building. Property-based tests (`fast-check`) cover the
core generation and scoring logic — see `src/app/math-quiz/**/*.spec.ts`.
