/** Pure maths for Months Left. */

export type Activity = 'sleep' | 'work' | 'chores' | 'eating' | 'free';

export interface ActivityInfo {
  id: Activity;
  label: string;
  color: string;
  /** Rough share of all remaining time; `free` gets whatever is left. */
  share: number;
}

export const ACTIVITIES: ActivityInfo[] = [
  { id: 'sleep', label: 'Sleep', color: '#818cf8', share: 1 / 3 }, // ~8 hours a day
  { id: 'work', label: 'Work', color: '#f59e0b', share: 1 / 4 }, // ~40-hour weeks
  { id: 'chores', label: 'Chores', color: '#64748b', share: 1 / 12 },
  { id: 'eating', label: 'Eating', color: '#34d399', share: 1 / 12 },
  { id: 'free', label: 'Free time', color: '#fde047', share: 0 },
];

export const MAX_AGE = 120;

export interface Breakdown {
  total: number;
  months: Record<Activity, number>;
}

/** Months left from `age` to `until`, split by activity. Parts always add up to the total. */
export function breakdown(age: number, until: number): Breakdown {
  const total = Math.max(0, Math.round((until - age) * 12));
  const months = { sleep: 0, work: 0, chores: 0, eating: 0, free: 0 } as Record<Activity, number>;
  let used = 0;
  for (const a of ACTIVITIES) {
    if (a.id !== 'free') {
      months[a.id] = Math.round(total * a.share);
      used += months[a.id];
    }
  }
  months.free = total - used;
  return { total, months };
}

/** Activity of each month in order (sleep first, free last), for drawing. */
export function monthList(b: Breakdown): Activity[] {
  return ACTIVITIES.flatMap((a) => Array<Activity>(b.months[a.id]).fill(a.id));
}

/** Dots per row: a multiple of 12 (whole years) that keeps dots at least `minCell` px wide. */
export function columnsFor(width: number, minCell = 11): number {
  const years = Math.max(1, Math.floor(width / (minCell * 12)));
  return years * 12;
}
