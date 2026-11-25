import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-watchlist-list',
  imports: [],
  templateUrl: './watchlist-list.html',
  styleUrl: './watchlist-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WatchlistList {}
