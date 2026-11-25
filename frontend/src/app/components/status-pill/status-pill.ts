import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ApplicationStatus } from '../../models/application.model';

export function statusModifier(status: ApplicationStatus): string {
  return status.replaceAll('_', '-');
}

@Component({
  selector: 'app-status-pill',
  imports: [TranslatePipe],
  templateUrl: './status-pill.html',
  styleUrl: './status-pill.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusPill {
  readonly status = input.required<ApplicationStatus>();

  protected readonly modifierClass = computed(() => `status-pill--${statusModifier(this.status())}`);
}
