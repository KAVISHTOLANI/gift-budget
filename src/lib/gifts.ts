import { addDays, addMonths, daysBetween, isValidISODate } from '../shared/dates';

export interface Person {
  id: string;
  name: string;
  relation: string;
  likes: string;
  demo?: boolean;
}

export interface Occasion {
  id: string;
  name: string;
  /** For yearly occasions only month and day matter. */
  date: string;
  yearly: boolean;
  budget: number;
  /** Days needed for delivery or making something; sets the "shop by" date. */
  bufferDays: number;
  demo?: boolean;
}

export const STATUSES = ['idea', 'planned', 'bought', 'wrapped', 'given'] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<Status, string> = { idea: 'Idea', planned: 'Planned', bought: 'Bought', wrapped: 'Wrapped', given: 'Given' };

export interface Gift {
  id: string;
  personId: string;
  occasionId: string | null; // null = unassigned idea
  title: string;
  estimate: number | null;
  actual: number | null;
  status: Status;
  where: string;
  notes: string;
  /** Date it was given (for history across years). */
  givenOn?: string;
  demo?: boolean;
}

export const round = (n: number) => Math.round(n * 100) / 100;
const pad = (n: number) => String(n).padStart(2, '0');

/** Next date on or after today. Yearly occasions on 29 Feb fall on 28 Feb in non-leap years. */
export function nextDate(o: Pick<Occasion, 'date' | 'yearly'>, today: string): string {
  if (!o.yearly) return o.date;
  const [, m, d] = o.date.split('-').map(Number);
  const make = (y: number) => {
    const last = new Date(y, m, 0).getDate();
    return `${y}-${pad(m)}-${pad(Math.min(d, last))}`;
  };
  const y = Number(today.slice(0, 4));
  const thisYear = make(y);
  return thisYear >= today ? thisYear : make(y + 1);
}

export function shopBy(o: Occasion, today: string): string {
  return addDays(nextDate(o, today), -o.bufferDays);
}

export const isPast = (o: Occasion, today: string) => !o.yearly && o.date < today;

/** Money committed to a gift: the actual price once bought, otherwise the estimate once planned. Ideas cost nothing yet. */
export function committed(g: Gift): number {
  if (g.status === 'idea') return 0;
  if (g.actual != null && g.status !== 'planned') return g.actual;
  return g.estimate ?? g.actual ?? 0;
}

export function spent(g: Gift): number {
  return g.status === 'bought' || g.status === 'wrapped' || g.status === 'given' ? g.actual ?? g.estimate ?? 0 : 0;
}

/** For yearly occasions, gifts given on or before last year's date belong to an earlier cycle. */
export function inCycle(g: Gift, o: Occasion, today: string): boolean {
  if (g.occasionId !== o.id) return false;
  if (!o.yearly || g.status !== 'given' || !g.givenOn) return true;
  const prev = addMonths(nextDate(o, today), -12);
  return g.givenOn > prev;
}

export function occasionSummary(o: Occasion, gifts: Gift[], today: string) {
  const list = gifts.filter((g) => inCycle(g, o, today));
  const c = round(list.reduce((s, g) => s + committed(g), 0));
  const sp = round(list.reduce((s, g) => s + spent(g), 0));
  return {
    budget: o.budget,
    committed: c,
    spent: sp,
    remaining: round(o.budget - c),
    over: c > o.budget,
    counts: Object.fromEntries(STATUSES.map((s) => [s, list.filter((g) => g.status === s).length])) as Record<Status, number>,
    gifts: list,
  };
}

/** People with no gift beyond "idea" for this occasion. */
export function stillToSort(o: Occasion, people: Person[], gifts: Gift[], recipients: string[]): Person[] {
  return people.filter((p) => recipients.includes(p.id) && !gifts.some((g) => g.occasionId === o.id && g.personId === p.id && g.status !== 'idea'));
}

export function advance(s: Status): Status {
  const i = STATUSES.indexOf(s);
  return STATUSES[Math.min(i + 1, STATUSES.length - 1)];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

/** Earlier gifts already given to the same person that look like this one (shared significant words). */
export function givenBefore(personId: string, title: string, gifts: Gift[], excludeId?: string): Gift[] {
  const words = new Set(norm(title).split(' ').filter((w) => w.length > 3));
  if (!words.size) return [];
  return gifts.filter((g) => g.id !== excludeId && g.personId === personId && g.status === 'given' && norm(g.title).split(' ').some((w) => words.has(w)));
}

export function perPerson(people: Person[], gifts: Gift[], occasionId?: string) {
  return people.map((p) => {
    const list = gifts.filter((g) => g.personId === p.id && (!occasionId || g.occasionId === occasionId));
    return { person: p, count: list.length, committed: round(list.reduce((s, g) => s + committed(g), 0)), spent: round(list.reduce((s, g) => s + spent(g), 0)) };
  });
}

export function validateGift(d: { personId: string; title: string; estimate: string; actual: string }) {
  const e: Partial<Record<'personId' | 'title' | 'estimate' | 'actual', string>> = {};
  if (!d.personId) e.personId = 'Choose who it’s for.';
  if (!d.title.trim()) e.title = 'Describe the gift.';
  for (const k of ['estimate', 'actual'] as const) {
    const v = d[k].trim();
    if (v && (!Number.isFinite(Number(v)) || Number(v) < 0)) e[k] = 'Use a number of 0 or more.';
  }
  return e;
}

export function validateOccasion(d: { name: string; date: string; budget: string; bufferDays: string }) {
  const e: Partial<Record<'name' | 'date' | 'budget' | 'bufferDays', string>> = {};
  if (!d.name.trim()) e.name = 'Name the occasion.';
  if (!isValidISODate(d.date)) e.date = 'Choose the date.';
  const b = Number(d.budget);
  if (!d.budget.trim() || !Number.isFinite(b) || b < 0) e.budget = 'Set a budget of 0 or more.';
  const buf = Number(d.bufferDays);
  if (!Number.isInteger(buf) || buf < 0 || buf > 90) e.bufferDays = 'Use 0–90 days.';
  return e;
}

export const daysTo = (iso: string, today: string) => daysBetween(today, iso);
