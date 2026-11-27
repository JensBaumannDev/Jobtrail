import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { DEFAULT_PDF_OPTIONS, PDF_COLUMNS } from '../../core/pdf-report';
import { buildApplication } from '../../core/testing/application.factory';
import { LanguageService } from '../../services/language.service';
import { PdfPreview } from './pdf-preview';

function render(count: number): HTMLElement {
  TestBed.configureTestingModule({
    imports: [PdfPreview],
    providers: [provideTranslateService(), { provide: LanguageService, useValue: { current: signal('de') } }],
  });
  const fixture = TestBed.createComponent(PdfPreview);
  const applications = Array.from({ length: count }, (_, index) => buildApplication({ id: index + 1 }));
  fixture.componentRef.setInput('options', { ...DEFAULT_PDF_OPTIONS, columns: PDF_COLUMNS });
  fixture.componentRef.setInput('applications', applications);
  fixture.detectChanges();
  return fixture.nativeElement;
}

function headers(element: HTMLElement): string[] {
  return [...element.querySelectorAll('.pdf-preview__header')].map((node) => node.textContent?.trim() ?? '');
}

describe('PdfPreview', () => {
  it('offers no next step columns, not even with every column selected', () => {
    const shown = headers(render(2));
    expect(shown).not.toContain('pdfOptions.columns.nextStep');
    expect(shown).not.toContain('pdfOptions.columns.nextStepOn');
    expect(shown).toContain('pdfOptions.columns.appliedOn');
  });

  it('shows one row per application', () => {
    expect(render(3).querySelectorAll('.pdf-preview__row').length).toBe(3);
  });

  it('has no separate count footer that could end up alone on a page', () => {
    expect(render(3).querySelector('footer')).toBeNull();
  });

  it('starts the sheet at full size when the width can not be measured', () => {
    const sheet = render(1).querySelector<HTMLElement>('.pdf-preview__sheet');
    expect(sheet?.style.getPropertyValue('--sheet-scale')).toBe('1');
  });
});
