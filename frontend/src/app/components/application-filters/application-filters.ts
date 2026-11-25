import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import {
  ApplicationFilterState,
  StatusFilter,
  StatusFilterCounts,
} from '../../core/application-filters';
import { APPLICATION_STATUSES } from '../../models/application.model';
import { statusModifier } from '../status-pill/status-pill';

export const SEARCH_MAX_LENGTH = 120;

@Component({
  selector: 'app-application-filters',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './application-filters.html',
  styleUrl: './application-filters.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationFilters {
  readonly filters = model.required<ApplicationFilterState>();
  readonly counts = input.required<StatusFilterCounts>();

  protected readonly statuses = APPLICATION_STATUSES;
  protected readonly searchMaxLength = SEARCH_MAX_LENGTH;
  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly status = new FormControl<StatusFilter>('all', { nonNullable: true });

  protected readonly statusClass = computed(() => {
    const status = this.filters().status;
    return status === 'all' ? '' : `application-filters__status--${statusModifier(status)}`;
  });

  constructor() {
    this.search.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((query) => this.filters.update((filters) => ({ ...filters, query })));
    this.status.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((status) => this.filters.update((filters) => ({ ...filters, status })));
  }

  protected toggleRemote(): void {
    this.filters.update((filters) => ({ ...filters, remoteOnly: !filters.remoteOnly }));
  }

  protected toggleFollowUp(): void {
    this.filters.update((filters) => ({ ...filters, followUpOnly: !filters.followUpOnly }));
  }
}
