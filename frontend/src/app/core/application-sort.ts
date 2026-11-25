import { APPLICATION_STATUSES, Application } from '../models/application.model';
import { isFollowUpDue, upcomingDate } from './application-stats';

export type SortKey = 'company' | 'location' | 'next' | 'status';
export type SortDirection = 'ascending' | 'descending';

export interface SortState {
  key: SortKey | null;
  direction: SortDirection;
}

type Comparator = (first: Application, second: Application) => number;

export const UNSORTED: SortState = { key: null, direction: 'ascending' };

const LAST_DATE = '9999-12-31';

const COMPARATORS: Record<SortKey, Comparator> = {
  company: (first, second) => compareText(first.company, second.company),
  location: (first, second) => compareText(first.location, second.location),
  next: compareNextStep,
  status: compareStatus,
};

export function toggleSort(state: SortState, key: SortKey): SortState {
  if (state.key !== key) {
    return { key, direction: 'ascending' };
  }
  return { key, direction: state.direction === 'ascending' ? 'descending' : 'ascending' };
}

export function sortApplications(
  applications: readonly Application[],
  sort: SortState,
  today: string,
): Application[] {
  const fallback = defaultOrder(today);
  const sign = sort.direction === 'ascending' ? 1 : -1;
  const chosen = sort.key ? COMPARATORS[sort.key] : null;
  return [...applications].sort(
    (first, second) => (chosen ? chosen(first, second) * sign : 0) || fallback(first, second),
  );
}

export function defaultOrder(today: string): Comparator {
  return (first, second) =>
    compareNextStep(first, second) ||
    Number(isFollowUpDue(second, today)) - Number(isFollowUpDue(first, today)) ||
    compareStatus(first, second) ||
    (second.applied_on ?? '').localeCompare(first.applied_on ?? '');
}

function compareText(first: string, second: string): number {
  return first.localeCompare(second, undefined, { sensitivity: 'base' });
}

function compareNextStep(first: Application, second: Application): number {
  return (upcomingDate(first) ?? LAST_DATE).localeCompare(upcomingDate(second) ?? LAST_DATE);
}

function compareStatus(first: Application, second: Application): number {
  return APPLICATION_STATUSES.indexOf(first.status) - APPLICATION_STATUSES.indexOf(second.status);
}
