import { APPLICATION_STATUSES, Application, ApplicationStatus } from '../models/application.model';

export const PDF_SECTIONS = ['stats', 'distribution', 'list'] as const;
export type PdfSection = (typeof PDF_SECTIONS)[number];

export const PDF_COLUMNS = [
  'role',
  'location',
  'appliedOn',
  'contact',
  'website',
] as const;
export type PdfColumn = (typeof PDF_COLUMNS)[number];

export const PDF_SORTS = ['status', 'company', 'date'] as const;
export type PdfSort = (typeof PDF_SORTS)[number];

export interface PdfReportOptions {
  title: string;
  sections: readonly PdfSection[];
  columns: readonly PdfColumn[];
  statuses: readonly ApplicationStatus[];
  sort: PdfSort;
}

export const DEFAULT_PDF_COLUMNS: readonly PdfColumn[] = ['role', 'location', 'appliedOn'];

export const DEFAULT_PDF_OPTIONS: PdfReportOptions = {
  title: '',
  sections: PDF_SECTIONS,
  columns: DEFAULT_PDF_COLUMNS,
  statuses: APPLICATION_STATUSES,
  sort: 'status',
};

export interface StatusCount {
  status: ApplicationStatus;
  count: number;
}

export function selectApplications(
  applications: readonly Application[],
  statuses: readonly ApplicationStatus[],
  sort: PdfSort,
): Application[] {
  return applications
    .filter((application) => statuses.includes(application.status))
    .sort(SORTERS[sort]);
}

export function statusCounts(
  applications: readonly Application[],
  statuses: readonly ApplicationStatus[],
): StatusCount[] {
  return APPLICATION_STATUSES.filter((status) => statuses.includes(status)).map((status) => ({
    status,
    count: applications.filter((application) => application.status === status).length,
  }));
}

function byCompany(first: Application, second: Application): number {
  return first.company.localeCompare(second.company, undefined, { sensitivity: 'base' });
}

function byStatus(first: Application, second: Application): number {
  const order =
    APPLICATION_STATUSES.indexOf(first.status) - APPLICATION_STATUSES.indexOf(second.status);
  return order || byCompany(first, second);
}

function byNewestApplication(first: Application, second: Application): number {
  return (second.applied_on ?? '').localeCompare(first.applied_on ?? '') || byCompany(first, second);
}

const SORTERS: Record<PdfSort, (first: Application, second: Application) => number> = {
  status: byStatus,
  company: byCompany,
  date: byNewestApplication,
};
