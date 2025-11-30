import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

export type GameMode = 'classic' | 'practice';

@Component({
  selector: 'app-start-page',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './start-page.component.html',
  styleUrls: ['./start-page.component.css']
})
export class StartPageComponent {
  selectedMode: GameMode = 'classic';

  selectMode(mode: GameMode): void {
    this.selectedMode = mode;
  }
}
