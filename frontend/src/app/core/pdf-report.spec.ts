import { Application } from '../models/application.model';
import { selectApplications, statusCounts } from './pdf-report';
import { buildApplication } from './testing/application.factory';

const applications = [
  buildApplication({ id: 1, company: 'Beta', status: 'offer', applied_on: '2026-11-02' }),
  buildApplication({ id: 2, company: 'alpha', status: 'awaiting_response', applied_on: '2026-11-10' }),
  buildApplication({ id: 3, company: 'Gamma', status: 'not_applied' }),
  buildApplication({ id: 4, company: 'Delta', status: 'awaiting_response', applied_on: '2026-11-05' }),
];

function ids(selected: Application[]): number[] {
  return selected.map((item) => item.id);
}

describe('selectApplications', () => {
  it('keeps only the chosen statuses', () => {
    const selected = selectApplications(applications, ['awaiting_response'], 'company');
    expect(ids(selected)).toEqual([2, 4]);
  });

  it('sorts by status order, then company', () => {
    const selected = selectApplications(
      applications,
      ['not_applied', 'awaiting_response', 'offer'],
      'status',
    );
    expect(ids(selected)).toEqual([3, 2, 4, 1]);
  });

  it('sorts by company ignoring case', () => {
    const selected = selectApplications(applications, ['awaiting_response', 'offer'], 'company');
    expect(ids(selected)).toEqual([2, 1, 4]);
  });

  it('sorts by newest application date with undated entries last', () => {
    const selected = selectApplications(
      applications,
      ['not_applied', 'awaiting_response', 'offer'],
      'date',
    );
    expect(ids(selected)).toEqual([2, 4, 1, 3]);
  });

  it('does not change the original array', () => {
    const original = [...applications];
    selectApplications(applications, ['offer', 'awaiting_response'], 'company');
    expect(applications).toEqual(original);
  });
});

describe('statusCounts', () => {
  it('counts chosen statuses in status order', () => {
    expect(statusCounts(applications, ['offer', 'awaiting_response'])).toEqual([
      { status: 'awaiting_response', count: 2 },
      { status: 'offer', count: 1 },
    ]);
  });
});
