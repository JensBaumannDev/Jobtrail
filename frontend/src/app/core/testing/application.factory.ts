import { Application } from '../../models/application.model';

export const BASE_APPLICATION: Application = {
  id: 1,
  company: 'Example GmbH',
  website: 'https://example.com/',
  role: 'Fullstack Developer',
  location: '',
  work_mode: 'remote',
  status: 'not_applied',
  applied_on: null,
  responded_on: null,
  next_step: '',
  next_step_on: null,
  job_ad_url: '',
  contact: '',
  salary_expectation: '',
  notes: [],
  created_at: '2026-11-01T10:00:00Z',
  updated_at: '2026-11-01T10:00:00Z',
};

export function buildApplication(overrides: Partial<Application> = {}): Application {
  return { ...BASE_APPLICATION, notes: [], ...overrides };
}
