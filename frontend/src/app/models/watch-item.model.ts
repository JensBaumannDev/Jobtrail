export const WATCH_PLANS = ['apply', 'watch'] as const;

export type WatchPlan = (typeof WATCH_PLANS)[number];

export interface WatchItem {
  id: number;
  company: string;
  website: string;
  careers_url: string;
  location: string;
  plan: WatchPlan;
  note: string;
  created_at: string;
  updated_at: string;
}

export type WatchItemInput = Pick<
  WatchItem,
  'company' | 'website' | 'careers_url' | 'location' | 'plan' | 'note'
>;
