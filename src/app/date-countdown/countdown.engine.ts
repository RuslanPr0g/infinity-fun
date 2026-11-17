/** Pure time maths for Date Countdown. All dates are local time (what people mean by "a date"). */

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

/** Whole days/hours/minutes/seconds between now and the target, counted on the absolute gap. */
export function timeLeft(target: Date, now: Date): TimeLeft {
  const diff = target.getTime() - now.getTime();
  let s = Math.floor(Math.abs(diff) / 1000);
  const days = Math.floor(s / 86_400);
  s -= days * 86_400;
  const hours = Math.floor(s / 3600);
  s -= hours * 3600;
  const minutes = Math.floor(s / 60);
  return { days, hours, minutes, seconds: s - minutes * 60, isPast: diff < 0 };
}

/** 'HH:MM' → [h, m]; anything else → [0, 0]. */
export function parseTime(t: string | null | undefined): [number, number] {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t ?? '');
  if (!m) {
    return [0, 0];
  }
  const h = +m[1];
  const min = +m[2];
  return h < 24 && min < 60 ? [h, min] : [0, 0];
}

/** 'YYYY-MM-DD' (+ optional 'HH:MM') as a local date, or null when it is not a real date. */
export function parseLocalDate(date: string, time?: string | null): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) {
    return null;
  }
  const [h, min] = parseTime(time);
  const d = new Date(+m[1], +m[2] - 1, +m[3], h, min, 0, 0);
  return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : null;
}

/** The next time that weekday comes round (always in the future: today counts only if the time is still ahead). */
export function nextWeekday(dayName: string, time: string | null | undefined, now: Date): Date | null {
  const day = WEEKDAYS.indexOf(dayName);
  if (day < 0) {
    return null;
  }
  const [h, m] = parseTime(time);
  const t = new Date(now);
  t.setHours(h, m, 0, 0);
  t.setDate(now.getDate() + ((day - now.getDay() + 7) % 7));
  if (t.getTime() <= now.getTime()) {
    t.setDate(t.getDate() + 7);
  }
  return t;
}

export interface CountdownSetup {
  title: string;
  kind: 'date' | 'weekday';
  date: string;
  day: string;
  time: string;
}

export const DEFAULT_TITLE = 'Countdown';

/** The URL query for a setup (only what is set), e.g. "date=2027-01-01&title=New%20Year". */
export function toQuery(s: CountdownSetup): string {
  const q = new URLSearchParams();
  if (s.kind === 'date' && s.date) {
    q.set('date', s.date);
  }
  if (s.kind === 'weekday' && s.day) {
    q.set('day', s.day);
  }
  if (s.time) {
    q.set('time', s.time);
  }
  if (s.title.trim() && s.title.trim() !== DEFAULT_TITLE) {
    q.set('title', s.title.trim());
  }
  return q.toString();
}

export function fromQuery(query: string | URLSearchParams): CountdownSetup {
  const q = typeof query === 'string' ? new URLSearchParams(query) : query;
  const day = q.get('day') ?? '';
  return {
    title: q.get('title') || DEFAULT_TITLE,
    kind: q.get('date') || !day ? 'date' : 'weekday',
    date: q.get('date') ?? '',
    day,
    time: q.get('time') ?? '',
  };
}

export function targetOf(s: CountdownSetup, now: Date): Date | null {
  return s.kind === 'date' ? (s.date ? parseLocalDate(s.date, s.time) : null) : nextWeekday(s.day, s.time, now);
}

export function formatLeft(t: TimeLeft): string {
  return `${t.days}d ${t.hours}h ${t.minutes}m ${t.seconds}s ${t.isPast ? 'ago' : 'left'}`;
}
