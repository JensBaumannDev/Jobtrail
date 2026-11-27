import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { guestLimitKey } from '../../core/server-errors';
import { safeHttpUrl } from '../../core/url';
import { WATCH_PLANS, WatchItem, WatchPlan } from '../../models/watch-item.model';
import { ToastService } from '../../services/toast.service';
import { WatchlistService } from '../../services/watchlist.service';

type PlanFilter = 'all' | WatchPlan;

interface PlanOption {
  value: PlanFilter;
  labelKey: string;
  count: number;
}

export const WATCHLIST_HEADING_ID = 'watchlist-heading';

export function watchEditButtonId(id: number): string {
  return `watch-edit-${id}`;
}

export function watchConvertButtonId(id: number): string {
  return `watch-convert-${id}`;
}

function matchesQuery(item: WatchItem, query: string): boolean {
  const haystack = [item.company, item.location, item.note].join(' ').toLowerCase();
  return !query || haystack.includes(query);
}

function byPlanThenCompany(first: WatchItem, second: WatchItem): number {
  const rank = (item: WatchItem) => (item.plan === 'apply' ? 0 : 1);
  return (
    rank(first) - rank(second) ||
    first.company.localeCompare(second.company, undefined, { sensitivity: 'base' })
  );
}

@Component({
  selector: 'app-watchlist-list',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './watchlist-list.html',
  styleUrl: './watchlist-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WatchlistList {
  private readonly watchlist = inject(WatchlistService);
  private readonly toast = inject(ToastService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  readonly editingId = input<number | null>(null);
  readonly edit = output<WatchItem>();
  readonly removed = output<number>();

  readonly search = new FormControl('', { nonNullable: true });
  readonly planFilter = new FormControl<PlanFilter>('all', { nonNullable: true });
  private readonly query = toSignal(this.search.valueChanges, { initialValue: '' });
  private readonly plan = toSignal(this.planFilter.valueChanges, { initialValue: 'all' });

  readonly convertingId = signal<number | null>(null);
  readonly convertedCompany = signal('');

  readonly visibleItems = this.watchlist.watchItems;

  readonly filteredItems = computed(() => {
    const query = this.query().trim().toLowerCase();
    const plan = this.plan();
    return this.visibleItems()
      .filter((item) => plan === 'all' || item.plan === plan)
      .filter((item) => matchesQuery(item, query))
      .sort(byPlanThenCompany);
  });

  readonly planOptions = computed<PlanOption[]>(() => {
    const items = this.visibleItems();
    return [
      { value: 'all', labelKey: 'watchlist.allCompanies', count: items.length },
      ...WATCH_PLANS.map((plan) => ({
        value: plan,
        labelKey: `plan.${plan}`,
        count: items.filter((item) => item.plan === plan).length,
      })),
    ];
  });

  readonly editButtonId = watchEditButtonId;
  readonly convertButtonId = watchConvertButtonId;

  linkFor(url: string): string | null {
    return safeHttpUrl(url);
  }

  async convert(item: WatchItem): Promise<void> {
    this.convertingId.set(item.id);
    this.convertedCompany.set('');
    const focusTarget = this.neighborFocusId(item);
    const converted = await this.tryConvert(item);
    this.convertingId.set(null);
    this.focusAfterRender(converted ? focusTarget : watchConvertButtonId(item.id));
  }

  remove(item: WatchItem): void {
    const focusTarget = this.neighborFocusId(item);
    this.removed.emit(item.id);
    this.watchlist.deleteWithUndo(item, () => this.focusAfterRender(watchEditButtonId(item.id)));
    this.focusAfterRender(focusTarget);
  }

  private async tryConvert(item: WatchItem): Promise<boolean> {
    try {
      await this.watchlist.convert(item.id);
      this.removed.emit(item.id);
      this.convertedCompany.set(item.company);
      this.toast.show('watchlist.converted', { company: item.company });
      return true;
    } catch (error) {
      const limitKey = guestLimitKey(error, 'applications');
      this.toast.show(limitKey ?? 'watchlist.convertFailed', { company: item.company });
      return false;
    }
  }

  private neighborFocusId(item: WatchItem): string {
    const items = this.filteredItems();
    const index = items.findIndex((entry) => entry.id === item.id);
    const neighbor = items[index + 1] ?? items[index - 1];
    return neighbor && neighbor.id !== item.id ? watchConvertButtonId(neighbor.id) : WATCHLIST_HEADING_ID;
  }

  private focusAfterRender(elementId: string): void {
    afterNextRender(
      () => {
        const target = this.document.getElementById(elementId);
        (target ?? this.document.getElementById(WATCHLIST_HEADING_ID))?.focus();
      },
      { injector: this.injector },
    );
  }
}
