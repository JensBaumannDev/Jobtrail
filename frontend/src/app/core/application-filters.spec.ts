import { Application } from '../models/application.model';
import { buildApplication } from './testing/application.factory';
import {
  INITIAL_FILTERS,
  countForStatusFilter,
  filterApplications,
  matchesSearch,
} from './application-filters';

const today = '2026-12-01';

function application(overrides: Partial<Application>): Application {
  return buildApplication({ work_mode: 'hybrid', location: 'Hamburg', contact: 'Anna Schmidt', ...overrides });
}

const remote = application({ id: 1, company: 'Remote AG', work_mode: 'remote' });
const due = application({
  id: 2,
  company: 'Waiting GmbH',
  status: 'awaiting_response',
  applied_on: '2026-11-10',
});
const offer = application({ id: 3, company: 'Offer KG', status: 'offer', location: 'Berlin' });
const all = [remote, due, offer];

describe('matchesSearch', () => {
  it('matches company, role, location and contact case-insensitively', () => {
    expect(matchesSearch(offer, 'offer')).toBe(true);
    expect(matchesSearch(offer, 'FULLSTACK')).toBe(true);
    expect(matchesSearch(offer, 'berlin')).toBe(true);
    expect(matchesSearch(offer, 'schmidt')).toBe(true);
  });

  it('matches everything for an empty or blank query', () => {
    expect(matchesSearch(offer, '   ')).toBe(true);
  });

  it('does not match unrelated text', () => {
    expect(matchesSearch(offer, 'munich')).toBe(false);
  });
});

describe('filterApplications', () => {
  it('returns all applications without filters', () => {
    expect(filterApplications(all, INITIAL_FILTERS, today)).toEqual(all);
  });

  it('keeps only remote applications', () => {
    const filters = { ...INITIAL_FILTERS, remoteOnly: true };
    expect(filterApplications(all, filters, today)).toEqual([remote]);
  });

  it('keeps only applications with a follow-up due', () => {
    const filters = { ...INITIAL_FILTERS, followUpOnly: true };
    expect(filterApplications(all, filters, today)).toEqual([due]);
  });

  it('filters by status', () => {
    const filters = { ...INITIAL_FILTERS, status: 'offer' as const };
    expect(filterApplications(all, filters, today)).toEqual([offer]);
  });

  it('combines search and toggles', () => {
    const filters = { ...INITIAL_FILTERS, query: 'offer', remoteOnly: true };
    expect(filterApplications(all, filters, today)).toEqual([]);
  });
});

describe('countForStatusFilter', () => {
  it('counts per status after search and toggles but before the status filter', () => {
    const filters = { ...INITIAL_FILTERS, query: 'g', status: 'offer' as const };
    const counts = countForStatusFilter(all, filters, today);
    expect(counts.all).toBe(3);
    expect(counts.byStatus.offer).toBe(1);
    expect(counts.byStatus.awaiting_response).toBe(1);
    expect(counts.byStatus.rejected_after_interview).toBe(0);
  });
});
