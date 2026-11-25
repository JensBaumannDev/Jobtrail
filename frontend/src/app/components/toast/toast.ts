import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  imports: [TranslatePipe],
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toast {
  private readonly toasts = inject(ToastService);

  protected readonly current = this.toasts.current;
  protected readonly currentUndo = this.toasts.currentUndo;

  protected undo(): void {
    this.toasts.undo();
  }

  protected pause(): void {
    this.toasts.pause();
  }

  protected resume(): void {
    this.toasts.resume();
  }
}
