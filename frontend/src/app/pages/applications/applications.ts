import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ApplicationFilters } from '../../components/application-filters/application-filters';
import { ApplicationForm } from '../../components/application-form/application-form';
import { ApplicationList } from '../../components/application-list/application-list';
import { ApplicationSummary } from '../../components/application-summary/application-summary';
import { PageHero } from '../../components/page-hero/page-hero';
import { StatusDistribution } from '../../components/status-distribution/status-distribution';
import {
  ApplicationFilterState,
  INITIAL_FILTERS,
  countForStatusFilter,
  filterApplications,
} from '../../core/application-filters';
import { summarize } from '../../core/application-stats';
import { todayIso } from '../../core/dates';
import { Application } from '../../models/application.model';
import { ApplicationService } from '../../services/application.service';
import { ToastService } from '../../services/toast.service';

type LoadState = 'loading' | 'ready' | 'error';

const FOCUSABLE = 'a[href], button, select, input, textarea';

@Component({
  selector: 'app-applications',
  imports: [
    TranslatePipe,
    PageHero,
    ApplicationSummary,
    StatusDistribution,
    ApplicationFilters,
    ApplicationList,
    ApplicationForm,
  ],
  templateUrl: './applications.html',
  styleUrl: './applications.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Applications implements OnInit {
  private readonly applicationService = inject(ApplicationService);
  private readonly toast = inject(ToastService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly listTitle = viewChild<ElementRef<HTMLElement>>('listTitle');
  private readonly addPanel = viewChild<ElementRef<HTMLElement>>('addPanel');
  private formTrigger: HTMLElement | null = null;

  protected readonly today = todayIso();
  protected readonly loadState = signal<LoadState>(
    this.applicationService.isLoaded() ? 'ready' : 'loading',
  );
  protected readonly filters = signal<ApplicationFilterState>(INITIAL_FILTERS);
  protected readonly formOpen = signal(false);

  protected readonly applications = this.applicationService.applications;
  protected readonly summary = computed(() => summarize(this.applications(), this.today));
  protected readonly statusCounts = computed(() =>
    countForStatusFilter(this.applications(), this.filters(), this.today),
  );
  protected readonly filteredApplications = computed(() =>
    filterApplications(this.applications(), this.filters(), this.today),
  );

  async ngOnInit(): Promise<void> {
    if (this.applicationService.isLoaded()) {
      return;
    }
    try {
      await this.applicationService.load();
      this.loadState.set('ready');
    } catch {
      this.loadState.set('error');
    }
  }

  protected openForm(event: Event): void {
    this.formTrigger = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    this.formOpen.set(true);
    afterNextRender(() => this.focusFirstField(), { injector: this.injector });
  }

  protected formSaved(application: Application): void {
    this.formOpen.set(false);
    this.toast.show('applications.created', { company: application.company });
    this.showList();
  }

  protected formCancelled(): void {
    this.formOpen.set(false);
    const trigger = this.formTrigger;
    afterNextRender(() => trigger?.focus(), { injector: this.injector });
  }

  protected showList(): void {
    const title = this.listTitle()?.nativeElement;
    if (!title) {
      return;
    }
    title.focus({ preventScroll: true });
    title.scrollIntoView({ behavior: this.prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  protected deleteApplication(application: Application): void {
    const nextAction = this.neighbourRowAction(application.id);
    this.applicationService.deleteWithUndo(application, () =>
      this.focusAfterRender(() => this.document.getElementById(`application-edit-${application.id}`)),
    );
    this.focusAfterRender(() => nextAction ?? this.listTitle()?.nativeElement ?? null);
  }

  private neighbourRowAction(id: number): HTMLElement | null {
    const row = this.document.getElementById(`application-edit-${id}`)?.closest('li');
    const neighbour = row?.nextElementSibling ?? row?.previousElementSibling;
    return neighbour?.querySelector<HTMLElement>(FOCUSABLE) ?? null;
  }

  private focusAfterRender(target: () => HTMLElement | null): void {
    afterNextRender(() => target()?.focus(), { injector: this.injector });
  }

  private focusFirstField(): void {
    const panel = this.addPanel()?.nativeElement;
    panel?.scrollIntoView({ behavior: this.prefersReducedMotion() ? 'auto' : 'smooth' });
    panel?.querySelector<HTMLElement>('input, select, textarea')?.focus({ preventScroll: true });
  }

  private prefersReducedMotion(): boolean {
    return this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}
