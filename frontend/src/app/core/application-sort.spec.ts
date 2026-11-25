import { Application } from '../models/application.model';
import { buildApplication } from './testing/application.factory';
import { UNSORTED, sortApplications, toggleSort } from './application-sort';

const today = '2026-12-01';

function ids(applications: Application[]): number[] {
  return applications.map((item) => item.id);
}

describe('toggleSort', () => {
  it('starts ascending on a new column', () => {
    expect(toggleSort(UNSORTED, 'company')).toEqual({ key: 'company', direction: 'ascending' });
  });

  it('flips the direction on the same column', () => {
    const ascending = toggleSort(UNSORTED, 'status');
    expect(toggleSort(ascending, 'status').direction).toBe('descending');
    expect(toggleSort(toggleSort(ascending, 'status'), 'status').direction).toBe('ascending');
  });

  it('resets to ascending when switching columns', () => {
    const descending = { key: 'company' as const, direction: 'descending' as const };
    expect(toggleSort(descending, 'location').direction).toBe('ascending');
  });
});

describe('sortApplications', () => {
  const alpha = buildApplication({ id: 1, company: 'alpha', location: 'Köln', status: 'offer' });
  const beta = buildApplication({ id: 2, company: 'Beta', location: 'Berlin', next_step_on: '2026-12-05' });
  const gamma = buildApplication({
    id: 3,
    company: 'Gamma',
    location: 'Aachen',
    status: 'awaiting_response',
    next_step_on: '2026-12-02',
  });
  const list = [alpha, beta, gamma];

  it('sorts by company ignoring case, in both directions', () => {
    expect(ids(sortApplications(list, { key: 'company', direction: 'ascending' }, today))).toEqual([1, 2, 3]);
    expect(ids(sortApplications(list, { key: 'company', direction: 'descending' }, today))).toEqual([3, 2, 1]);
  });

  it('sorts by location', () => {
    expect(ids(sortApplications(list, { key: 'location', direction: 'ascending' }, today))).toEqual([3, 2, 1]);
  });

  it('sorts by next step date with missing dates last', () => {
    expect(ids(sortApplications(list, { key: 'next', direction: 'ascending' }, today))).toEqual([3, 2, 1]);
  });

  it('sorts by status in pipeline order', () => {
    expect(ids(sortApplications(list, { key: 'status', direction: 'ascending' }, today))).toEqual([2, 3, 1]);
  });

  it('ignores the date of closed applications', () => {
    const rejected = buildApplication({ id: 4, status: 'rejected_after_interview', next_step_on: '2026-12-01' });
    expect(ids(sortApplications([rejected, beta], UNSORTED, today))).toEqual([2, 4]);
  });

  it('puts due follow-ups first when no date decides', () => {
    const due = buildApplication({ id: 5, status: 'awaiting_response', applied_on: '2026-11-01' });
    const fresh = buildApplication({ id: 6, status: 'awaiting_response', applied_on: '2026-11-28' });
    expect(ids(sortApplications([fresh, due], UNSORTED, today))).toEqual([5, 6]);
  });

  it('does not change the input array', () => {
    const input = [gamma, alpha];
    sortApplications(input, { key: 'company', direction: 'ascending' }, today);
    expect(ids(input)).toEqual([3, 1]);
  });
});
