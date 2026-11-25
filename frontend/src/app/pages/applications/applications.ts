import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-applications',
  imports: [],
  templateUrl: './applications.html',
  styleUrl: './applications.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Applications {}
