import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PageHero } from '../../components/page-hero/page-hero';

interface SectionShape {
  paragraphs: number;
  items?: number;
  closings?: number;
  showsAddress?: boolean;
}

interface PrivacySection {
  titleKey: string;
  paragraphKeys: string[];
  itemKeys: string[];
  closingKeys: string[];
  showsAddress: boolean;
}

function translationKeys(name: string, part: string, count = 0): string[] {
  return Array.from({ length: count }, (_, index) => `privacy.${name}.${part}${index + 1}`);
}

function section(name: string, shape: SectionShape): PrivacySection {
  return {
    titleKey: `privacy.${name}.title`,
    paragraphKeys: translationKeys(name, 'text', shape.paragraphs),
    itemKeys: translationKeys(name, 'item', shape.items),
    closingKeys: translationKeys(name, 'closing', shape.closings),
    showsAddress: shape.showsAddress ?? false,
  };
}

@Component({
  selector: 'app-privacy-policy',
  imports: [TranslatePipe, PageHero],
  templateUrl: './privacy-policy.html',
  styleUrl: './privacy-policy.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPolicy {
  protected readonly email = 'info@jensbaumann.com';
  protected readonly sections: PrivacySection[] = [
    section('overview', { paragraphs: 1 }),
    section('controller', { paragraphs: 1, showsAddress: true }),
    section('serverLogs', { paragraphs: 1, items: 6, closings: 1 }),
    section('cookies', { paragraphs: 2 }),
    section('applicationData', { paragraphs: 2 }),
    section('guestAccess', { paragraphs: 2 }),
    section('localStorage', { paragraphs: 2 }),
    section('rights', { paragraphs: 1, items: 8, closings: 1 }),
  ];
}
