import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { parseIsoDate } from '../../core/dates';
import { displayHost, safeHttpUrl } from '../../core/url';
import { Application } from '../../models/application.model';
import { LanguageService } from '../../services/language.service';
import { NoteList } from '../note-list/note-list';

@Component({
  selector: 'app-application-details',
  imports: [TranslatePipe, NoteList],
  templateUrl: './application-details.html',
  styleUrl: './application-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'application-details' },
})
export class ApplicationDetails {
  private readonly language = inject(LanguageService);

  readonly application = input.required<Application>();
  readonly editRequested = output<void>();

  readonly jobAdUrl = computed(() => safeHttpUrl(this.application().job_ad_url));
  readonly jobAdHost = computed(() => displayHost(this.application().job_ad_url));
  readonly appliedOn = computed(() => this.formatDate(this.application().applied_on));
  readonly respondedOn = computed(() => this.formatDate(this.application().responded_on));
  readonly isMissingDetails = computed(() => {
    const application = this.application();
    return !application.job_ad_url && !application.contact && !application.salary_expectation;
  });
  readonly hasFacts = computed(
    () => !this.isMissingDetails() || this.appliedOn() !== '' || this.respondedOn() !== '',
  );

  requestEdit(): void {
    this.editRequested.emit();
  }

  private formatDate(value: string | null): string {
    if (!value) {
      return '';
    }
    const locale = this.language.current() === 'en' ? 'en-GB' : 'de-DE';
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(parseIsoDate(value));
  }
}
