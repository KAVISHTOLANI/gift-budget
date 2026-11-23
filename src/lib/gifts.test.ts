import { describe, expect, it } from 'vitest';
import { advance, committed, givenBefore, nextDate, occasionSummary, perPerson, shopBy, spent, stillToSort, validateGift, validateOccasion, type Gift, type Occasion, type Person } from './gifts';

const today = '2026-11-23';
const g = (p: Partial<Gift>): Gift => ({ id: Math.random().toString(), personId: 'a', occasionId: 'xmas', title: 'Book', estimate: 20, actual: null, status: 'idea', where: '', notes: '', ...p });
const xmas: Occasion = { id: 'xmas', name: 'Winter holidays', date: '2020-12-25', yearly: true, budget: 200, bufferDays: 10 };

describe('dates', () => {
  it('finds the next yearly date, rolling into next year when passed', () => {
    expect(nextDate(xmas, today)).toBe('2026-12-25');
    expect(nextDate({ date: '2001-03-02', yearly: true }, today)).toBe('2027-03-02');
    expect(nextDate({ date: '2026-11-23', yearly: true }, today)).toBe('2026-11-23');
    expect(nextDate({ date: '2024-02-29', yearly: true }, today)).toBe('2027-02-28');
    expect(nextDate({ date: '2027-06-01', yearly: false }, today)).toBe('2027-06-01');
  });
  it('sets a shop-by date from the buffer', () => {
    expect(shopBy(xmas, today)).toBe('2026-12-15');
  });
});

describe('money', () => {
  it('commits estimates once planned and actuals once bought', () => {
    expect(committed(g({}))).toBe(0);
    expect(committed(g({ status: 'planned' }))).toBe(20);
    expect(committed(g({ status: 'bought', actual: 17.5 }))).toBe(17.5);
    expect(spent(g({ status: 'planned' }))).toBe(0);
    expect(spent(g({ status: 'given', actual: null, estimate: 12 }))).toBe(12);
  });
  it('summarises an occasion and flags overspending', () => {
    const list = [g({ status: 'planned', estimate: 120 }), g({ status: 'bought', actual: 95.5 }), g({ status: 'idea', estimate: 300 }), g({ occasionId: 'other', status: 'bought', actual: 999 })];
    const s = occasionSummary(xmas, list, today);
    expect(s).toMatchObject({ committed: 215.5, spent: 95.5, remaining: -15.5, over: true });
    expect(s.counts).toMatchObject({ idea: 1, planned: 1, bought: 1 });
  });
  it('leaves last year’s given gifts out of this year’s cycle', () => {
    const old = g({ status: 'given', actual: 50, givenOn: '2025-12-25' });
    const recent = g({ status: 'given', actual: 20, givenOn: '2026-11-20' });
    expect(occasionSummary(xmas, [old, recent], today).spent).toBe(20);
  });
  it('totals per person', () => {
    const people: Person[] = [{ id: 'a', name: 'A', relation: '', likes: '' }, { id: 'b', name: 'B', relation: '', likes: '' }];
    const out = perPerson(people, [g({ status: 'bought', actual: 30 }), g({ personId: 'b', status: 'planned', estimate: 15 })], 'xmas');
    expect(out.map((x) => [x.person.id, x.committed, x.spent])).toEqual([['a', 30, 30], ['b', 15, 0]]);
  });
  it('lists recipients with nothing beyond ideas', () => {
    const people: Person[] = ['a', 'b', 'c'].map((id) => ({ id, name: id, relation: '', likes: '' }));
    expect(stillToSort(xmas, people, [g({ status: 'planned' }), g({ personId: 'b' })], ['a', 'b']).map((p) => p.id)).toEqual(['b']);
  });
});

describe('gift history and validation', () => {
  it('warns about similar gifts already given to the same person', () => {
    const history = [g({ id: 'old', title: 'Scented candle set', status: 'given' }), g({ personId: 'b', title: 'Candle', status: 'given' }), g({ title: 'Candle holder', status: 'planned' })];
    expect(givenBefore('a', 'Lavender candle', history).map((x) => x.id)).toEqual(['old']);
    expect(givenBefore('a', 'Mug', history)).toEqual([]);
  });
  it('advances status up to given', () => {
    expect(advance('idea')).toBe('planned');
    expect(advance('wrapped')).toBe('given');
    expect(advance('given')).toBe('given');
  });
  it('validates gifts and occasions', () => {
    expect(Object.keys(validateGift({ personId: '', title: ' ', estimate: '-1', actual: 'x' })).sort()).toEqual(['actual', 'estimate', 'personId', 'title']);
    expect(Object.keys(validateOccasion({ name: '', date: '', budget: '', bufferDays: '100' })).sort()).toEqual(['budget', 'bufferDays', 'date', 'name']);
  });
});
