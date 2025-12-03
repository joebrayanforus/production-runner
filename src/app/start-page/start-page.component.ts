
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  LeaderboardService,
  LeaderboardEntry
} from '../services/leaderboard.service';

export type GameMode = 'classic' | 'practice';

@Component({
  selector: 'app-start-page',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './start-page.component.html',
  styleUrls: ['./start-page.component.css']
})
export class StartPageComponent implements OnInit, OnDestroy {
  selectedMode: GameMode = 'classic';

  leaderboard: LeaderboardEntry[] = [];

  constructor(private leaderboardService: LeaderboardService) {}

  ngOnInit(): void {
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
}
