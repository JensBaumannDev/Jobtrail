import { buildApplication } from './testing/application.factory';
import { countByStatus, isFollowUpDue, summarize } from './application-stats';

const today = '2026-12-01';

const mixedApplications = [
  buildApplication({ id: 1, status: 'not_applied' }),
  buildApplication({ id: 2, status: 'awaiting_response', applied_on: '2026-11-25' }),
  buildApplication({
    id: 3,
    status: 'intro_call_scheduled',
    applied_on: '2026-11-10',
    responded_on: '2026-11-20',
    next_step_on: '2026-12-03',
  }),
  buildApplication({
    id: 4,
    status: 'rejected_after_application',
    applied_on: '2026-11-01',
    responded_on: '2026-11-05',
    next_step_on: '2026-12-02',
  }),
];

describe('isFollowUpDue', () => {
  it('is due after 14 days without response', () => {
    const waiting = buildApplication({ status: 'awaiting_response', applied_on: '2026-11-17' });
    expect(isFollowUpDue(waiting, today)).toBe(true);
  });

  it('is not due before 14 days', () => {
    const fresh = buildApplication({ status: 'awaiting_response', applied_on: '2026-11-20' });
    expect(isFollowUpDue(fresh, today)).toBe(false);
  });

  it('is not due after a response', () => {
    const answered = buildApplication({
      status: 'awaiting_response',
      applied_on: '2026-11-01',
      responded_on: '2026-11-05',
    });
    expect(isFollowUpDue(answered, today)).toBe(false);
  });
});

describe('summarize', () => {
  it('returns zeros for an empty list', () => {
    expect(summarize([], today)).toEqual({
      active: 0,
      sent: 0,
      responseRate: 0,
      upcoming: 0,
      followUpDue: 0,
      averageResponseDays: 0,
    });
  });

  it('counts active and sent applications', () => {
    const summary = summarize(mixedApplications, today);
    expect(summary.active).toBe(2);
    expect(summary.sent).toBe(3);
  });

  it('computes response rate, upcoming steps and average response time', () => {
    const summary = summarize(mixedApplications, today);
    expect(summary.responseRate).toBe(67);
    expect(summary.upcoming).toBe(1);
    expect(summary.averageResponseDays).toBe(7);
  });
});

describe('countByStatus', () => {
  it('counts every status, including zero', () => {
    const counts = countByStatus([buildApplication({ status: 'offer' }), buildApplication({ status: 'offer' })]);
    expect(counts.offer).toBe(2);
    expect(counts.not_applied).toBe(0);
  });
});
