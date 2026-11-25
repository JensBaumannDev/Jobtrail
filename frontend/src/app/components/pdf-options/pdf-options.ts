import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import {
  DEFAULT_PDF_OPTIONS,
  PDF_COLUMNS,
  PDF_SECTIONS,
  PDF_SORTS,
  PdfReportOptions,
  PdfSort,
} from '../../core/pdf-report';
import { APPLICATION_STATUSES } from '../../models/application.model';
import { StatusPill } from '../status-pill/status-pill';

type CheckboxGroup<Key extends string> = FormGroup<Record<Key, FormControl<boolean>>>;

function checkedKeys<Key extends string>(keys: readonly Key[], values: Partial<Record<Key, boolean>>): Key[] {
  return keys.filter((key) => values[key]);
}

@Component({
  selector: 'app-pdf-options',
  imports: [ReactiveFormsModule, TranslatePipe, StatusPill],
  templateUrl: './pdf-options.html',
  styleUrl: './pdf-options.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfOptions {
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly selectedCount = input(0);
  readonly totalCount = input(0);
  readonly optionsChange = output<PdfReportOptions>();
  readonly printRequested = output<void>();

  readonly sections = PDF_SECTIONS;
  readonly columns = PDF_COLUMNS;
  readonly statuses = APPLICATION_STATUSES;
  readonly sorts = PDF_SORTS;

  readonly form = this.formBuilder.group({
    title: [DEFAULT_PDF_OPTIONS.title, Validators.maxLength(120)],
    sections: this.checkboxGroup(PDF_SECTIONS, DEFAULT_PDF_OPTIONS.sections),
    columns: this.checkboxGroup(PDF_COLUMNS, DEFAULT_PDF_OPTIONS.columns),
    statuses: this.checkboxGroup(APPLICATION_STATUSES, DEFAULT_PDF_OPTIONS.statuses),
    sort: [DEFAULT_PDF_OPTIONS.sort as PdfSort],
  });

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.optionsChange.emit(this.currentOptions()));
  }

  private currentOptions(): PdfReportOptions {
    const value = this.form.getRawValue();
    return {
      title: value.title.trim(),
      sections: checkedKeys(PDF_SECTIONS, value.sections),
      columns: checkedKeys(PDF_COLUMNS, value.columns),
      statuses: checkedKeys(APPLICATION_STATUSES, value.statuses),
      sort: value.sort,
    };
  }

  private checkboxGroup<Key extends string>(keys: readonly Key[], checked: readonly Key[]): CheckboxGroup<Key> {
    const controls = Object.fromEntries(
      keys.map((key) => [key, this.formBuilder.control(checked.includes(key))]),
    ) as Record<Key, FormControl<boolean>>;
    return new FormGroup(controls);
  }
}
