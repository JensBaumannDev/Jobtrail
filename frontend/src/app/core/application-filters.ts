import { Application, ApplicationStatus } from '../models/application.model';
import { countByStatus, isFollowUpDue } from './application-stats';

export type StatusFilter = ApplicationStatus | 'all';

export interface ApplicationFilterState {
  query: string;
  status: StatusFilter;
  remoteOnly: boolean;
  followUpOnly: boolean;
}

export interface StatusFilterCounts {
  all: number;
  byStatus: Record<ApplicationStatus, number>;
}

export const INITIAL_FILTERS: ApplicationFilterState = {
  query: '',
  status: 'all',
  remoteOnly: false,
  followUpOnly: false,
};

export function matchesSearch(application: Application, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  const haystack = [application.company, application.role, application.location, application.contact];
  return haystack.join(' ').toLowerCase().includes(needle);
}

export function matchesStatus(application: Application, status: StatusFilter): boolean {
  return status === 'all' || application.status === status;
}

export function matchesToggles(
  application: Application,
  filters: ApplicationFilterState,
  today: string,
): boolean {
  if (filters.remoteOnly && application.work_mode !== 'remote') {
    return false;
  }
  return !filters.followUpOnly || isFollowUpDue(application, today);
}

export function filterApplications(
  applications: readonly Application[],
  filters: ApplicationFilterState,
  today: string,
): Application[] {
  return applicationsBeforeStatus(applications, filters, today).filter((application) =>
    matchesStatus(application, filters.status),
  );
}

export function countForStatusFilter(
  applications: readonly Application[],
  filters: ApplicationFilterState,
  today: string,
): StatusFilterCounts {
  const candidates = applicationsBeforeStatus(applications, filters, today);
  return { all: candidates.length, byStatus: countByStatus(candidates) };
}

function applicationsBeforeStatus(
  applications: readonly Application[],
  filters: ApplicationFilterState,
  today: string,
): Application[] {
  return applications.filter(
    (application) =>
      matchesSearch(application, filters.query) && matchesToggles(application, filters, today),
  );
}
