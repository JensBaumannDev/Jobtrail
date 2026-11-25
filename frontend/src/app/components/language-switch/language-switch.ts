import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppLanguage, LanguageService } from '../../services/language.service';

const TARGET_NAMES: Record<AppLanguage, string> = {
  de: 'Deutsch',
  en: 'English',
};

@Component({
  selector: 'app-language-switch',
  imports: [TranslatePipe],
  templateUrl: './language-switch.html',
  styleUrl: './language-switch.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSwitch {
  private readonly language = inject(LanguageService);

  protected readonly target = computed<AppLanguage>(() =>
    this.language.current() === 'en' ? 'de' : 'en',
  );
  protected readonly targetName = computed(() => TARGET_NAMES[this.target()]);
  protected readonly currentCode = computed(() => (this.target() === 'en' ? 'DE' : 'EN'));

  protected switchLanguage(): void {
    this.language.use(this.target());
  }
}
