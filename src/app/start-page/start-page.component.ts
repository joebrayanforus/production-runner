import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type GameMode = 'classic' | 'practice';

@Component({
  selector: 'app-start-page',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './start-page.component.html',
  styleUrls: ['./start-page.component.css']
})
export class StartPageComponent {
  selectedMode: GameMode = 'classic';
  playerName = '';

  selectMode(mode: GameMode): void {
    this.selectedMode = mode;
  }

  isPlayerNameValid(): boolean {
    return this.playerName.trim().length > 0;
  }
}
