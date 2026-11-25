import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-pdf-preview',
  imports: [],
  templateUrl: './pdf-preview.html',
  styleUrl: './pdf-preview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfPreview {}
