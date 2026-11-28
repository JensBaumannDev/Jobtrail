import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ConnectionService } from '../../services/connection.service';

@Component({
  selector: 'app-connection-notice',
  imports: [TranslatePipe],
  templateUrl: './connection-notice.html',
  styleUrl: './connection-notice.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status' },
})
export class ConnectionNotice {
  protected readonly isOnline = inject(ConnectionService).isOnline;
}
