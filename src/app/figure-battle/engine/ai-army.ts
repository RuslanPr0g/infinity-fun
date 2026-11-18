import { ARCHETYPES, Mix, buildArmy } from './autoplay';
import { ARENA, Battlefield, STEP, Snapshot } from './battlefield';
import { UNIT_ORDER, UNIT_TYPES } from './unit-data';

/**
 * The computer opponent in Vs Computer mode. It tries many red armies against the player's blue
 * army on a hidden battlefield and keeps the one that does best. Every red army costs at most what
 * the blue army costs.
 */

export interface Plan {
  snap: Snapshot;
  score: number;
}

interface Candidate {
  mix: Mix | null;
  snap: Snapshot;
  total: number;
  runs: number;
}

/** Longest battle a test run plays, in steps (3 minutes of game time). */
const MAX_STEPS = 60 * 180;

/** Red army that copies blue, mirrored onto the red side. */
export function mirrorArmy(blue: Snapshot): Snapshot {
  return blue.filter(([, t]) => t === 0).map(([k, , x, y]) => [k, 1, 2 * ARENA.x + ARENA.w - x, y]);
}

/** Share of the army's cost that goes to each troop. */
export function mixOf(snap: Snapshot): Mix {
  const mix: Mix = {};
  for (const [k] of snap) {
    mix[k] = (mix[k] ?? 0) + UNIT_TYPES[k].cost;
  }
  return mix;
}

export function valueOf(snap: Snapshot): number {
  return snap.reduce((a, [k]) => a + UNIT_TYPES[k].cost, 0);
}

/** A fresh field with the blue army on it and red limited to blue's cost. */
function field(blue: Snapshot): Battlefield {
  const bf = new Battlefield();
  bf.setupSandbox();
  bf.restore(blue.filter(([, t]) => t === 0));
  bf.infinite = false;
  bf.budget = bf.armyValue(0);
  return bf;
}

export function redArmy(blue: Snapshot, mix: Mix): Snapshot {
  const bf = field(blue);
  buildArmy(bf, null, mix, 1);
  return bf.snapshot(1);
}

/**
 * Plays one battle to the end. Score for red: above 1 is a win (more is a cleaner win),
 * below 1 is a loss (more means blue paid more for it).
 */
export function scoreBattle(blue: Snapshot, red: Snapshot): number {
  const bf = field(blue);
  bf.infinite = true;
  bf.restore(red);
  if (bf.armyCount(1) === 0) {
    return 0;
  }
  bf.startBattle();
  let steps = 0;
  while (bf.running && steps < MAX_STEPS) {
    bf.step(STEP);
    steps++;
  }
  const kept = 1 - bf.lostValue[1] / Math.max(1, bf.startValue[1]);
  const hurt = bf.lostValue[0] / Math.max(1, bf.startValue[0]);
  if (bf.winner === 1) {
    return 1 + 0.5 + 0.5 * kept;
  }
  if (bf.winner === 0) {
    return hurt;
  }
  // Time up or both gone: whoever has more left is ahead.
  return 0.5 + 0.5 * (hurt - (1 - kept));
}

type Rng = () => number;

function mutate(mix: Mix, rng: Rng): Mix {
  const out: Mix = { ...mix };
  const changes = 1 + Math.floor(rng() * 2);
  for (let i = 0; i < changes; i++) {
    const k = UNIT_ORDER[Math.floor(rng() * UNIT_ORDER.length)];
    const total = Object.values(out).reduce((a, b) => a + (b ?? 0), 0) || 1;
    const now = out[k] ?? 0;
    // Add a troop, or halve / drop one already there.
    out[k] = now > 0 && rng() < 0.5 ? (rng() < 0.4 ? 0 : now / 2) : now + total * (0.1 + rng() * 0.25);
  }
  if (Object.values(out).every((v) => !v)) {
    out.square = 1;
  }
  return out;
}

/**
 * Searches for a red army one battle at a time, so the caller can spread the work over frames.
 * Call `step()` until it returns false (or time runs out), then read `best()`.
 */
export class ArmyPlanner {
  private readonly pool: Candidate[] = [];
  private queue: Candidate[] = [];
  private played = 0;

  constructor(
    private readonly blue: Snapshot,
    private readonly maxRuns = 40,
    private readonly rng: Rng = Math.random,
  ) {
    const own = mixOf(blue.filter(([, t]) => t === 0));
    this.add(null, mirrorArmy(blue));
    this.add(own);
    for (const mix of Object.values(ARCHETYPES)) {
      this.add(mix);
    }
    // One troop type alone, for each type that fits the budget.
    const value = valueOf(blue.filter(([, t]) => t === 0));
    for (const k of UNIT_ORDER) {
      if (UNIT_TYPES[k].cost * 3 <= value) {
        this.add({ [k]: 1 });
      }
    }
  }

  get runs(): number {
    return this.played;
  }

  get done(): boolean {
    return this.played >= this.maxRuns;
  }

  /** Plays one test battle. Returns false once the search is finished. */
  step(): boolean {
    if (this.done) {
      return false;
    }
    let c = this.queue.shift();
    if (!c) {
      c = this.next();
    }
    c.total += scoreBattle(this.blue, c.snap);
    c.runs++;
    this.played++;
    return !this.done;
  }

  best(): Plan {
    const tried = this.pool.filter((c) => c.runs > 0);
    const list = tried.length > 0 ? tried : this.pool;
    let best = list[0];
    for (const c of list) {
      if (this.avg(c) > this.avg(best)) {
        best = c;
      }
    }
    return { snap: best.snap, score: this.avg(best) };
  }

  private avg(c: Candidate): number {
    // A single lucky run counts for a bit less than a result seen twice.
    return c.runs === 0 ? -1 : c.total / c.runs - (c.runs === 1 ? 0.05 : 0);
  }

  private add(mix: Mix | null, snap?: Snapshot, queue = true): Candidate {
    const c: Candidate = { mix, snap: snap ?? redArmy(this.blue, mix ?? {}), total: 0, runs: 0 };
    this.pool.push(c);
    if (queue) {
      this.queue.push(c);
    }
    return c;
  }

  /** After the first round: re-test the leaders, and try changes to them. */
  private next(): Candidate {
    const ranked = this.pool.filter((c) => c.runs > 0).sort((a, b) => this.avg(b) - this.avg(a));
    const top = ranked.slice(0, 3);
    const unsure = top.find((c) => c.runs < 2);
    if (unsure) {
      return unsure;
    }
    const base = top[Math.floor(this.rng() * top.length)] ?? this.pool[0];
    const mix = mutate(base.mix ?? mixOf(base.snap), this.rng);
    return this.add(mix, undefined, false);
  }
}
