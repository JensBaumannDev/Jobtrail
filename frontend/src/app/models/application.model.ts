export const APPLICATION_STATUSES = [
  'not_applied',
  'awaiting_response',
  'intro_call_scheduled',
  'further_interview',
  'offer',
  'rejected_after_application',
  'rejected_after_interview',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const WORK_MODES = ['remote', 'hybrid', 'on_site'] as const;

export type WorkMode = (typeof WORK_MODES)[number];

export const ACTIVE_STATUSES: readonly ApplicationStatus[] = [
  'awaiting_response',
  'intro_call_scheduled',
  'further_interview',
];

export const CLOSED_STATUSES: readonly ApplicationStatus[] = [
  'rejected_after_application',
  'rejected_after_interview',
];

export interface Note {
  id: number;
  title: string;
  text: string;
  updated_at: string;
}

export interface Application {
  id: number;
  company: string;
  website: string;
  role: string;
  location: string;
  work_mode: WorkMode;
  status: ApplicationStatus;
  applied_on: string | null;
  responded_on: string | null;
  next_step: string;
  next_step_on: string | null;
  job_ad_url: string;
  contact: string;
  salary_expectation: string;
  notes: Note[];
  created_at: string;
  updated_at: string;
}

export type ApplicationInput = Pick<
  Application,
  | 'company'
  | 'website'
  | 'role'
  | 'location'
  | 'work_mode'
  | 'status'
  | 'next_step'
  | 'next_step_on'
  | 'job_ad_url'
  | 'contact'
  | 'salary_expectation'
>;

export type NoteInput = Pick<Note, 'title' | 'text'>;
