import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-application-summary',
  imports: [],
  templateUrl: './application-summary.html',
  styleUrl: './application-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationSummary {}
