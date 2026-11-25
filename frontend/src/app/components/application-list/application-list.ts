import { DOCUMENT } from '@angular/common';
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
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { daysUntilNextStep, isFollowUpDue } from '../../core/application-stats';
import {
  SortDirection,
  SortKey,
  SortState,
  UNSORTED,
  sortApplications,
  toggleSort,
} from '../../core/application-sort';
import { daysBetween, parseIsoDate } from '../../core/dates';
import { safeHttpUrl } from '../../core/url';
import {
  APPLICATION_STATUSES,
  Application,
  ApplicationStatus,
} from '../../models/application.model';
import { ApplicationService } from '../../services/application.service';
import { LanguageService } from '../../services/language.service';
import { ToastService } from '../../services/toast.service';
import { ApplicationDetails } from '../application-details/application-details';
import { ApplicationForm } from '../application-form/application-form';
import { statusModifier } from '../status-pill/status-pill';

type DateChipKind = 'overdue' | 'today' | 'tomorrow' | 'soon' | 'later';

interface DateChip {
  kind: DateChipKind;
  label: string;
}

interface ApplicationRow {
  application: Application;
  websiteUrl: string | null;
  followUpDue: boolean;
  dateChip: DateChip | null;
  appliedKey: string;
  appliedDate: string;
  appliedDays: number;
  statusClass: string;
}

interface SortColumn {
  key: SortKey;
  labelKey: string;
  active: boolean;
  direction: SortState['direction'];
}

const SORT_COLUMNS: readonly { key: SortKey; labelKey: string }[] = [
  { key: 'company', labelKey: 'list.columnCompany' },
  { key: 'location', labelKey: 'list.columnLocation' },
  { key: 'next', labelKey: 'list.columnNext' },
  { key: 'status', labelKey: 'list.columnStatus' },
];

interface SortOption {
  value: string;
  labelKey: string;
  directionKey: string;
}

const SORT_DIRECTIONS: readonly SortDirection[] = ['ascending', 'descending'];

const SORT_OPTIONS: readonly SortOption[] = SORT_COLUMNS.flatMap((column) =>
  SORT_DIRECTIONS.map((direction) => ({
    value: `${column.key}:${direction}`,
    labelKey: column.labelKey,
    directionKey: `list.${direction}`,
  })),
);

const SOON_WITHIN_DAYS = 7;

@Component({
  selector: 'app-application-list',
  imports: [TranslatePipe, ApplicationForm, ApplicationDetails],
  templateUrl: './application-list.html',
  styleUrl: './application-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationList {
  private readonly applicationService = inject(ApplicationService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  readonly applications = input.required<readonly Application[]>();
  readonly today = input.required<string>();
  readonly deleteRequested = output<Application>();

  protected readonly statuses = APPLICATION_STATUSES;
  protected readonly sortOptions = SORT_OPTIONS;
  protected readonly sort = signal<SortState>(UNSORTED);
  protected readonly expandedIds = signal<ReadonlySet<number>>(new Set());
  protected readonly editingId = signal<number | null>(null);

  protected readonly columns = computed<SortColumn[]>(() => {
    const sort = this.sort();
    return SORT_COLUMNS.map((column) => ({
      ...column,
      active: sort.key === column.key,
      direction: sort.direction,
    }));
  });

  protected readonly sortValue = computed(() => {
    const sort = this.sort();
    return sort.key ? `${sort.key}:${sort.direction}` : '';
  });

  private readonly formats = computed(() => {
    const locale = this.language.current() === 'en' ? 'en-GB' : 'de-DE';
    return {
      weekday: new Intl.DateTimeFormat(locale, { weekday: 'short', day: '2-digit', month: '2-digit' }),
      short: new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }),
    };
  });

  protected readonly rows = computed<ApplicationRow[]>(() =>
    sortApplications(this.applications(), this.sort(), this.today()).map((application) =>
      this.toRow(application),
    ),
  );

  protected sortBy(key: SortKey): void {
    this.sort.update((sort) => toggleSort(sort, key));
  }

  protected chooseSort(event: Event): void {
    const value = event.target instanceof HTMLSelectElement ? event.target.value : '';
    const [key, direction] = value.split(':');
    const column = SORT_COLUMNS.find((candidate) => candidate.key === key);
    const chosenDirection = SORT_DIRECTIONS.find((candidate) => candidate === direction);
    this.sort.set(column && chosenDirection ? { key: column.key, direction: chosenDirection } : UNSORTED);
  }

  protected toggleDetails(id: number): void {
    this.expandedIds.update((ids) => {
      const next = new Set(ids);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  }

  protected startEdit(application: Application): void {
    this.editingId.set(application.id);
    this.focusAfterRender(`#application-edit-panel-${application.id}`, 'input, select, textarea');
  }

  protected finishEdit(application: Application): void {
    this.editingId.set(null);
    this.toast.show('list.saved', { company: application.company });
    this.focusAfterRender(`#application-edit-${application.id}`);
  }

  protected cancelEdit(application: Application): void {
    this.editingId.set(null);
    this.focusAfterRender(`#application-edit-${application.id}`);
  }

  protected async changeStatus(application: Application, event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const status = APPLICATION_STATUSES.find((candidate) => candidate === select.value);
    if (!status || status === application.status) {
      return;
    }
    try {
      await this.applicationService.update(application.id, { status });
      this.announceStatus(application, status);
    } catch {
      select.value = application.status;
      this.toast.show('common.saveError');
    }
  }

  protected requestDelete(application: Application): void {
    this.editingId.update((id) => (id === application.id ? null : id));
    this.deleteRequested.emit(application);
  }

  private announceStatus(application: Application, status: ApplicationStatus): void {
    this.toast.show('list.statusChanged', {
      company: application.company,
      status: this.translate.instant(`status.${status}`),
    });
  }

  private toRow(application: Application): ApplicationRow {
    const appliedOn = application.applied_on;
    const appliedDays = appliedOn ? daysBetween(appliedOn, this.today()) : 0;
    return {
      application,
      websiteUrl: safeHttpUrl(application.website),
      followUpDue: isFollowUpDue(application, this.today()),
      dateChip: this.dateChip(application),
      appliedKey: this.appliedKey(appliedOn, appliedDays),
      appliedDate: appliedOn ? this.formats().short.format(parseIsoDate(appliedOn)) : '',
      appliedDays,
      statusClass: `application-list__status--${statusModifier(application.status)}`,
    };
  }

  private dateChip(application: Application): DateChip | null {
    const days = daysUntilNextStep(application, this.today());
    if (days === null || !application.next_step_on) {
      return null;
    }
    const label = this.formats().weekday.format(parseIsoDate(application.next_step_on));
    return { kind: this.dateChipKind(days), label };
  }

  private dateChipKind(days: number): DateChipKind {
    if (days < 0) {
      return 'overdue';
    }
    if (days <= 1) {
      return days === 0 ? 'today' : 'tomorrow';
    }
    return days <= SOON_WITHIN_DAYS ? 'soon' : 'later';
  }

  private appliedKey(appliedOn: string | null, days: number): string {
    if (!appliedOn) {
      return 'list.notApplied';
    }
    if (days < 0) {
      return 'list.appliedPlanned';
    }
    if (days <= 1) {
      return days === 1 ? 'list.appliedOneDay' : 'list.appliedToday';
    }
    return 'list.appliedDays';
  }

  private focusAfterRender(selector: string, innerSelector?: string): void {
    afterNextRender(
      () => {
        const element = this.document.querySelector<HTMLElement>(selector);
        const target = innerSelector ? element?.querySelector<HTMLElement>(innerSelector) : element;
        target?.focus();
      },
      { injector: this.injector },
    );
  }
}
