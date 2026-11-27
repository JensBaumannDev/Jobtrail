import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { PdfOptions } from './pdf-options';

function setup() {
  TestBed.configureTestingModule({ imports: [PdfOptions], providers: [provideTranslateService()] });
  const fixture = TestBed.createComponent(PdfOptions);
  fixture.detectChanges();
  const element: HTMLElement = fixture.nativeElement;
  const toggle = element.querySelector<HTMLButtonElement>('.pdf-options__toggle');
  const settings = element.querySelector<HTMLElement>('#pdf-options-settings');
  return { fixture, toggle, settings };
}

describe('PdfOptions settings toggle', () => {
  it('starts collapsed and points the toggle at the settings', () => {
    const { toggle, settings } = setup();
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(toggle?.getAttribute('aria-controls')).toBe('pdf-options-settings');
    expect(settings?.classList).toContain('pdf-options__settings--collapsed');
  });

  it('opens and closes the settings on click', () => {
    const { fixture, toggle, settings } = setup();
    toggle?.click();
    fixture.detectChanges();
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(settings?.classList).not.toContain('pdf-options__settings--collapsed');
    toggle?.click();
    fixture.detectChanges();
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps the download button outside the collapsible settings', () => {
    const { settings, fixture } = setup();
    const download = fixture.nativeElement.querySelector('.pdf-options__actions .button--primary');
    expect(download).not.toBeNull();
    expect(settings?.contains(download)).toBe(false);
  });
});
