import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PageHero } from '../../components/page-hero/page-hero';

interface LegalSection {
  titleKey: string;
  textKey: string;
}

@Component({
  selector: 'app-legal-notice',
  imports: [TranslatePipe, PageHero],
  templateUrl: './legal-notice.html',
  styleUrl: './legal-notice.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalNotice {
  protected readonly email = 'info@jensbaumann.com';
  protected readonly contactFormUrl = 'https://jensbaumann.com/contact';
  protected readonly sections: LegalSection[] = [
    { titleKey: 'legal.liabilityContentTitle', textKey: 'legal.liabilityContentText' },
    { titleKey: 'legal.liabilityLinksTitle', textKey: 'legal.liabilityLinksText' },
    { titleKey: 'legal.copyrightTitle', textKey: 'legal.copyrightText' },
  ];
}
