import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-application-details',
  imports: [],
  templateUrl: './application-details.html',
  styleUrl: './application-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationDetails {}
