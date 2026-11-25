import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { SessionService } from '../../services/session.service';
import { ToastService } from '../../services/toast.service';
import { LanguageSwitch } from '../language-switch/language-switch';
import { ThemeToggle } from '../theme-toggle/theme-toggle';

interface NavigationLink {
  path: string;
  labelKey: string;
}

@Component({
  selector: 'app-navigation',
  imports: [DatePipe, RouterLink, RouterLinkActive, TranslatePipe, LanguageSwitch, ThemeToggle],
  templateUrl: './navigation.html',
  styleUrl: './navigation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'closeMenuAndFocusButton()',
  },
})
export class Navigation {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly toasts = inject(ToastService);
  private readonly menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');

  private readonly language = inject(LanguageService).current;

  protected readonly locale = computed(() => this.language() ?? 'de');
  protected readonly isAuthenticated = this.auth.isAuthenticated;
  protected readonly currentUser = this.auth.currentUser;
  protected readonly menuOpen = signal(false);
  protected readonly loggingOut = signal(false);
  protected readonly links: NavigationLink[] = [
    { path: '/applications', labelKey: 'nav.applications' },
    { path: '/watchlist', labelKey: 'nav.watchlist' },
    { path: '/pdf', labelKey: 'nav.pdf' },
  ];

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => this.menuOpen.set(false));
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenuAndFocusButton(): void {
    if (!this.menuOpen()) {
      return;
    }
    this.menuOpen.set(false);
    this.menuButton()?.nativeElement.focus();
  }

  protected async logout(): Promise<void> {
    this.loggingOut.set(true);
    try {
      await this.session.logout();
      this.menuOpen.set(false);
    } catch {
      this.toasts.show('nav.logoutFailed');
    } finally {
      this.loggingOut.set(false);
    }
  }
}
