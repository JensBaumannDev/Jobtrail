import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnInit,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PageHero } from '../../components/page-hero/page-hero';
import { WatchlistForm } from '../../components/watchlist-form/watchlist-form';
import {
  WATCHLIST_HEADING_ID,
  WatchlistList,
  watchEditButtonId,
} from '../../components/watchlist-list/watchlist-list';
import { WatchItem } from '../../models/watch-item.model';
import { WatchlistService } from '../../services/watchlist.service';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-watchlist',
  imports: [PageHero, WatchlistForm, WatchlistList, TranslatePipe],
  templateUrl: './watchlist.html',
  styleUrl: './watchlist.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Watchlist implements OnInit {
  private readonly watchlist = inject(WatchlistService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  readonly loadState = signal<LoadState>(this.watchlist.isLoaded() ? 'ready' : 'loading');
  readonly editing = signal<WatchItem | null>(null);
  readonly headingId = WATCHLIST_HEADING_ID;

  async ngOnInit(): Promise<void> {
    if (this.loadState() === 'ready') {
      return;
    }
    try {
      await this.watchlist.load();
      this.loadState.set('ready');
    } catch {
      this.loadState.set('error');
    }
  }

  startEditing(item: WatchItem): void {
    this.editing.set(item);
  }

  stopEditing(): void {
    const editedId = this.editing()?.id;
    this.editing.set(null);
    if (editedId !== undefined) {
      this.focusEditButton(editedId);
    }
  }

  handleRemoved(id: number): void {
    if (this.editing()?.id === id) {
      this.editing.set(null);
    }
  }

  private focusEditButton(id: number): void {
    afterNextRender(() => this.document.getElementById(watchEditButtonId(id))?.focus(), {
      injector: this.injector,
    });
  }
}
