import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-status-pill',
  imports: [],
  templateUrl: './status-pill.html',
  styleUrl: './status-pill.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusPill {}
