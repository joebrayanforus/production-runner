
import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  LeaderboardService,
  LeaderboardEntry
} from '../services/leaderboard.service';
import { InputService } from '../services/input.service';

export type GameMode = 'classic' | '2player' | 'practice' | 'spielanleitung' | 'boss';

@Component({
  selector: 'app-start-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './start-page.component.html',
  styleUrls: ['./start-page.component.css']
})
export class StartPageComponent implements OnInit, OnDestroy {
  selectedMode: GameMode = 'classic';
  leaderboard: LeaderboardEntry[] = [];
  topScores: LeaderboardEntry[] = [];
  private readonly menuModes: GameMode[] = ['spielanleitung', 'classic', '2player', 'practice', 'boss'];
  private gamepadPollInterval: any;
  private lastKeyboardSelect = 0;

  constructor(
    private leaderboardService: LeaderboardService,
    private router: Router,
    private inputService: InputService
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
    const modes: GameMode[] = this.menuModes;
    const currentIndex = modes.indexOf(this.selectedMode);

    if (['ArrowUp', 'ArrowLeft'].includes(event.key)) {
      // Navigate to previous mode (with wrap around)
      const newIndex = currentIndex === 0 ? modes.length - 1 : currentIndex - 1;
      this.selectedMode = modes[newIndex];
      event.preventDefault();
    } else if (['ArrowDown', 'ArrowRight'].includes(event.key)) {
      // Navigate to next mode (with wrap around)
      const newIndex = (currentIndex + 1) % modes.length;
      this.selectedMode = modes[newIndex];
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
    if (this.selectedMode === 'spielanleitung') {
      this.router.navigate(['/spielanleitung']);
      return;
    }

    if (this.selectedMode === 'boss') {
      this.router.navigate(['/player-name'], {
        queryParams: { mode: 'classic', target: 'boss' }
      });
      return;
    }

    // For 2player mode, pass it as a separate parameter
    if (this.selectedMode === '2player') {
      this.router.navigate(['/player-name'], {
        queryParams: { mode: 'classic', players: '2' }
      });
    } else {
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
      // Try arcade joystick first, fallback to standard gamepad
      let currentDirection = this.inputService.getArcadeDirection(1);
      if (!currentDirection) {
        currentDirection = this.inputService.getDirection();
      }

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

      // Arcade Select button (Button 10) or standard A button (0) - Select mode and start game
      if (this.inputService.isArcadeSelectPressed() || this.inputService.isActionButtonPressed()) {
        const now = Date.now();
        if (now - lastSelectTime > 300) {
          this.startGame();
          lastSelectTime = now;
        }
      }
    }, 100);
  }

  private handleModeNavigation(direction: string): void {
    const modes = this.menuModes;
    let idx = modes.indexOf(this.selectedMode);
    if (idx < 0) idx = 0;

    const isPrev = direction === 'L' || direction === 'U';
    idx = isPrev ? (idx === 0 ? modes.length - 1 : idx - 1) : (idx + 1) % modes.length;

    this.selectedMode = modes[idx];
  }
}
