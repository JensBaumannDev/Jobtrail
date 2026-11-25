import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ApplicationSummary as Summary } from '../../core/application-stats';

interface SummaryStat {
  labelKey: string;
  value: number;
  unitKey: string | null;
}

@Component({
  selector: 'app-application-summary',
  imports: [TranslatePipe],
  templateUrl: './application-summary.html',
  styleUrl: './application-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationSummary {
  readonly summary = input.required<Summary>();

  protected readonly stats = computed<SummaryStat[]>(() => {
    const summary = this.summary();
    return [
      { labelKey: 'summary.active', value: summary.active, unitKey: null },
      { labelKey: 'summary.responseRate', value: summary.responseRate, unitKey: 'summary.percent' },
      { labelKey: 'summary.upcoming', value: summary.upcoming, unitKey: null },
      {
        labelKey: 'summary.followUpDue',
        value: summary.followUpDue,
        unitKey: this.applicationUnit(summary.followUpDue),
      },
    ];
  });

  private applicationUnit(count: number): string {
    return count === 1 ? 'summary.applicationOne' : 'summary.applicationMany';
  }
}
