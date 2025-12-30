
import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  LeaderboardService,
  LeaderboardEntry
} from '../services/leaderboard.service';

export type GameMode = 'classic' | 'practice' | 'spielanleitung';

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
  topScores: LeaderboardEntry[] = [];
  private gamepadPollInterval: any;
  private lastKeyboardSelect = 0;

  constructor(
    private leaderboardService: LeaderboardService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.leaderboardService.start();

    this.leaderboardService.leaderboard$
      .subscribe(entries => {
        this.leaderboard = entries;
        // Get only top 3 scores
        this.topScores = entries.slice(0, 3);
      });

    // Start gamepad polling for mode selection
    this.startGamepadPolling();
  }

  ngOnDestroy(): void {
    this.leaderboardService.stop();
    if (this.gamepadPollInterval) {
      clearInterval(this.gamepadPollInterval);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (['ArrowLeft', 'ArrowUp'].includes(event.key)) {
      this.selectedMode = 'classic';
      event.preventDefault();
    } else if (['ArrowRight', 'ArrowDown'].includes(event.key)) {
      this.selectedMode = 'practice';
      event.preventDefault();
    } else if (event.key === 'Enter') {
      const now = Date.now();
      if (now - this.lastKeyboardSelect > 250) {
        this.startGame();
        this.lastKeyboardSelect = now;
      }
      event.preventDefault();
    }
  }

  selectMode(mode: GameMode): void {
    this.selectedMode = mode;
  }

  startGame(): void {
    // Si mode spielanleitung, naviguer directement vers /spielanleitung
    if (this.selectedMode === 'spielanleitung') {
      this.router.navigate(['/spielanleitung']);
    } else {
      // Navigate to player-name page with selected game mode
      this.router.navigate(['/player-name'], {
        queryParams: { mode: this.selectedMode }
      });
    }
  }

  // Gamepad Polling for Mode Selection
  private startGamepadPolling(): void {
    let lastDirection = '';
    let directionHoldTime = 0;
    let lastSelectTime = 0;

    this.gamepadPollInterval = setInterval(() => {
      const gamepad = navigator.getGamepads()[0];
      if (!gamepad) return;

      // Detect direction from analog stick or D-pad
      let currentDirection = '';
      const threshold = 0.5;

      if (gamepad.axes[1] < -threshold || gamepad.buttons[12]?.pressed) currentDirection = 'U';
      else if (gamepad.axes[1] > threshold || gamepad.buttons[13]?.pressed) currentDirection = 'D';
      else if (gamepad.axes[0] < -threshold || gamepad.buttons[14]?.pressed) currentDirection = 'L';
      else if (gamepad.axes[0] > threshold || gamepad.buttons[15]?.pressed) currentDirection = 'R';

      // Handle direction input
      if (currentDirection && currentDirection === lastDirection) {
        directionHoldTime += 100;
        // Auto-repeat after 300ms
        if (directionHoldTime > 300) {
          this.handleModeNavigation(currentDirection);
        }
      } else if (currentDirection && currentDirection !== lastDirection) {
        lastDirection = currentDirection;
        directionHoldTime = 0;
        this.handleModeNavigation(currentDirection);
      } else {
        lastDirection = '';
        directionHoldTime = 0;
      }

      // A Button (0) - Select mode and start game
      if (gamepad.buttons[0]?.pressed) {
        const now = Date.now();
        if (now - lastSelectTime > 300) {
          this.startGame();
          lastSelectTime = now;
        }
      }
    }, 100);
  }

  private handleModeNavigation(direction: string): void {
    // Toggle between classic and practice with any direction key
    switch (direction) {
      case 'L':
      case 'U':
      case 'R':
      case 'D':
        this.selectedMode = this.selectedMode === 'classic' ? 'practice' : 'classic';
        break;
    }
  }
}
