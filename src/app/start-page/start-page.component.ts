
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LeaderboardService,
  LeaderboardEntry
} from '../services/leaderboard.service';
import { ScoreService, ScoreEntry } from '../services/score.service';

export type GameMode = 'classic' | 'practice';

@Component({
  selector: 'app-start-page',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './start-page.component.html',
  styleUrls: ['./start-page.component.css']
})
export class StartPageComponent implements OnInit, OnDestroy {
  selectedMode: GameMode = 'classic';
  playerName = '';

  leaderboard: LeaderboardEntry[] = [];
  lastScore: number | null = null;
  lastScores: ScoreEntry[] = [];

  constructor(private leaderboardService: LeaderboardService, private scoreService: ScoreService) {}

  ngOnInit(): void {
    this.lastScore = this.scoreService.getLastScore();
    this.lastScores = this.scoreService.getLastScores();

    this.leaderboardService.start();

    this.leaderboardService.leaderboard$
      .subscribe(entries => {
        this.leaderboard = entries;
      });
  }

  ngOnDestroy(): void {
    this.leaderboardService.stop();
  }

  selectMode(mode: GameMode): void {
    this.selectedMode = mode;
  }

  isPlayerNameValid(): boolean {
    return this.playerName.trim().length === 3;
  }

  onPlayerNameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Limit to 3 characters
    if (input.value.length > 3) {
      this.playerName = input.value.substring(0, 3);
    }
  }
}
