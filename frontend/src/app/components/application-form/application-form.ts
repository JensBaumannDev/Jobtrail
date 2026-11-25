import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-application-form',
  imports: [],
  templateUrl: './application-form.html',
  styleUrl: './application-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationForm {}
