import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-note-list',
  imports: [],
  templateUrl: './note-list.html',
  styleUrl: './note-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoteList {}
