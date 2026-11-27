import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ApplicationSummary, summarize } from '../../core/application-stats';
import { parseIsoDate, todayIso } from '../../core/dates';
import { scaleToFit } from '../../core/fit-scale';
import { PdfReportOptions, PdfSection, selectApplications, statusCounts } from '../../core/pdf-report';
import { displayHost } from '../../core/url';
import { Application, ApplicationStatus } from '../../models/application.model';
import { LanguageService } from '../../services/language.service';
import { StatusPill, statusModifier } from '../status-pill/status-pill';

interface ReportStat {
  labelKey: string;
  valueKey: string;
  value: number;
}

function horizontalSpace(element: HTMLElement): number {
  const style = getComputedStyle(element);
  return element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
}

function fitScale(frame: HTMLElement, sheet: HTMLElement): number {
  return scaleToFit(horizontalSpace(frame), parseFloat(getComputedStyle(sheet).width));
}

function reportStats(summary: ApplicationSummary): ReportStat[] {
  return [
    { labelKey: 'pdfPreview.stats.sent', valueKey: 'pdfPreview.number', value: summary.sent },
    { labelKey: 'pdfPreview.stats.active', valueKey: 'pdfPreview.number', value: summary.active },
    { labelKey: 'pdfPreview.stats.responseRate', valueKey: 'pdfPreview.percent', value: summary.responseRate },
    {
      labelKey: 'pdfPreview.stats.averageResponse',
      valueKey: 'pdfPreview.days',
      value: summary.averageResponseDays,
    },
  ];
}

@Component({
  selector: 'app-pdf-preview',
  imports: [TranslatePipe, StatusPill],
  templateUrl: './pdf-preview.html',
  styleUrl: './pdf-preview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfPreview {
  private readonly language = inject(LanguageService);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly options = input.required<PdfReportOptions>();
  readonly applications = input.required<readonly Application[]>();

  readonly today = todayIso();
  readonly sheetScale = signal(1);

  readonly items = computed(() =>
    selectApplications(this.applications(), this.options().statuses, this.options().sort),
  );

  readonly counts = computed(() => statusCounts(this.items(), this.options().statuses));

  readonly stats = computed(() => reportStats(summarize(this.items(), this.today)));

  private readonly dateFormat = computed(
    () =>
      new Intl.DateTimeFormat(this.language.current() === 'en' ? 'en-GB' : 'de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
  );

  constructor() {
    afterNextRender(() => this.fitSheetToWidth());
  }

  hasSection(section: PdfSection): boolean {
    return this.options().sections.includes(section);
  }

  formatDate(value: string | null): string {
    return value ? this.dateFormat().format(parseIsoDate(value)) : '–';
  }

  host(website: string): string {
    return displayHost(website) || '–';
  }

  modifier(status: ApplicationStatus): string {
    return statusModifier(status);
  }

  private fitSheetToWidth(): void {
    const frame = this.element.nativeElement.querySelector<HTMLElement>('.pdf-preview');
    const sheet = frame?.querySelector<HTMLElement>('.pdf-preview__sheet');
    if (!frame || !sheet || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(() => this.sheetScale.set(fitScale(frame, sheet)));
    observer.observe(frame);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
