import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { countByStatus, isSent } from '../../core/application-stats';
import { APPLICATION_STATUSES, Application, ApplicationStatus } from '../../models/application.model';
import { statusModifier } from '../status-pill/status-pill';

interface StatusShare {
  status: ApplicationStatus;
  count: number;
  modifier: string;
}

@Component({
  selector: 'app-status-distribution',
  imports: [TranslatePipe],
  templateUrl: './status-distribution.html',
  styleUrl: './status-distribution.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusDistribution {
  readonly applications = input.required<readonly Application[]>();

  protected readonly total = computed(() => this.applications().length);
  protected readonly sent = computed(() => this.applications().filter(isSent).length);

  protected readonly shares = computed<StatusShare[]>(() => {
    const counts = countByStatus(this.applications());
    return APPLICATION_STATUSES.map((status) => ({
      status,
      count: counts[status],
      modifier: statusModifier(status),
    }));
  });

  protected readonly filledShares = computed(() => this.shares().filter((share) => share.count > 0));
}
