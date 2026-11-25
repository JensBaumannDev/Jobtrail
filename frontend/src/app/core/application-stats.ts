import {
  ACTIVE_STATUSES,
  APPLICATION_STATUSES,
  Application,
  ApplicationStatus,
  CLOSED_STATUSES,
} from '../models/application.model';
import { daysBetween } from './dates';

export const FOLLOW_UP_AFTER_DAYS = 14;
export const UPCOMING_WITHIN_DAYS = 7;

export interface ApplicationSummary {
  active: number;
  sent: number;
  responseRate: number;
  upcoming: number;
  followUpDue: number;
  averageResponseDays: number;
}

export function isSent(application: Application): boolean {
  return application.status !== 'not_applied';
}

export function isActive(application: Application): boolean {
  return ACTIVE_STATUSES.includes(application.status);
}

export function isClosed(application: Application): boolean {
  return CLOSED_STATUSES.includes(application.status);
}

export function isFollowUpDue(application: Application, today: string): boolean {
  return (
    application.status === 'awaiting_response' &&
    !application.responded_on &&
    !!application.applied_on &&
    daysBetween(application.applied_on, today) >= FOLLOW_UP_AFTER_DAYS
  );
}

export function upcomingDate(application: Application): string | null {
  return application.next_step_on && !isClosed(application) ? application.next_step_on : null;
}

export function daysUntilNextStep(application: Application, today: string): number | null {
  const date = upcomingDate(application);
  return date ? daysBetween(today, date) : null;
}

export function summarize(applications: readonly Application[], today: string): ApplicationSummary {
  const sent = applications.filter(isSent);
  const answered = sent.filter((application) => !!application.responded_on);
  return {
    active: applications.filter(isActive).length,
    sent: sent.length,
    responseRate: sent.length ? Math.round((answered.length / sent.length) * 100) : 0,
    upcoming: applications.filter((application) => isUpcoming(application, today)).length,
    followUpDue: applications.filter((application) => isFollowUpDue(application, today)).length,
    averageResponseDays: averageResponseDays(answered),
  };
}

export function countByStatus(
  applications: readonly Application[],
): Record<ApplicationStatus, number> {
  const counts = Object.fromEntries(APPLICATION_STATUSES.map((status) => [status, 0])) as Record<
    ApplicationStatus,
    number
  >;
  for (const application of applications) {
    counts[application.status] += 1;
  }
  return counts;
}

function isUpcoming(application: Application, today: string): boolean {
  const days = daysUntilNextStep(application, today);
  return days !== null && days <= UPCOMING_WITHIN_DAYS;
}

function averageResponseDays(answered: readonly Application[]): number {
  const waits = answered
    .filter((application) => application.applied_on && application.responded_on)
    .map((application) => daysBetween(application.applied_on!, application.responded_on!));
  return waits.length ? Math.round(waits.reduce((sum, days) => sum + days, 0) / waits.length) : 0;
}
