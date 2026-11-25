import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PageHero } from '../../components/page-hero/page-hero';
import { PdfOptions } from '../../components/pdf-options/pdf-options';
import { PdfPreview } from '../../components/pdf-preview/pdf-preview';
import { DEFAULT_PDF_OPTIONS, PdfReportOptions } from '../../core/pdf-report';
import { ApplicationService } from '../../services/application.service';

type LoadState = 'loading' | 'ready' | 'error';

const PRINT_CLASS = 'is-printing-pdf';

@Component({
  selector: 'app-pdf-overview',
  imports: [PageHero, PdfOptions, PdfPreview, TranslatePipe],
  templateUrl: './pdf-overview.html',
  styleUrl: './pdf-overview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfOverview implements OnInit {
  private readonly applicationService = inject(ApplicationService);
  private readonly document = inject(DOCUMENT);

  readonly applications = this.applicationService.applications;
  readonly loadState = signal<LoadState>(this.applicationService.isLoaded() ? 'ready' : 'loading');
  readonly options = signal<PdfReportOptions>(DEFAULT_PDF_OPTIONS);
  readonly selectedCount = computed(
    () =>
      this.applications().filter((application) =>
        this.options().statuses.includes(application.status),
      ).length,
  );

  constructor() {
    this.document.body.classList.add(PRINT_CLASS);
    inject(DestroyRef).onDestroy(() => this.document.body.classList.remove(PRINT_CLASS));
  }

  async ngOnInit(): Promise<void> {
    if (this.loadState() === 'ready') {
      return;
    }
    try {
      await this.applicationService.load();
      this.loadState.set('ready');
    } catch {
      this.loadState.set('error');
    }
  }

  print(): void {
    this.document.defaultView?.print();
  }
}
