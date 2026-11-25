import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

export type AppLanguage = 'de' | 'en';

const STORAGE_KEY = 'jobtrail-language';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);

  readonly current = this.translate.currentLang;

  constructor() {
    effect(() => {
      const language = this.current();
      if (language) {
        this.document.documentElement.lang = language;
      }
    });
  }

  initialize(): Promise<unknown> {
    return firstValueFrom(this.translate.use(this.initialLanguage()));
  }

  use(language: AppLanguage): void {
    this.translate.use(language);
    this.storage()?.setItem(STORAGE_KEY, language);
  }

  private initialLanguage(): AppLanguage {
    const stored = this.storage()?.getItem(STORAGE_KEY);
    if (stored === 'de' || stored === 'en') {
      return stored;
    }
    const languages = this.document.defaultView?.navigator.languages ?? [];
    return languages[0]?.toLowerCase().startsWith('en') ? 'en' : 'de';
  }

  private storage(): Storage | null {
    try {
      return this.document.defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  }
}
