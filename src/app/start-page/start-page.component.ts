
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LeaderboardService,
  LeaderboardEntry
} from '../services/leaderboard.service';

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

  // Virtual Keyboard Variables
  keyboardVisible = false;
  keyboardRows: string[][] = [
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
    ['K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'],
    ['U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3'],
    ['4', '5', '6', '7', '8', '9', '-', '_', '@', ' ']
  ];
  selectedKeyIndex = 0;
  selectedRowIndex = 0;

  leaderboard: LeaderboardEntry[] = [];

  // Menu Navigation
  menuFocusIndex = 0; // 0: mode selection, 1: player name input
  private gamepadPollInterval: any;

  constructor(private leaderboardService: LeaderboardService) {}

  ngOnInit(): void {
    this.leaderboardService.start();

    this.leaderboardService.leaderboard$
      .subscribe(entries => {
        this.leaderboard = entries;
      });

    // Start gamepad polling for menu navigation
    this.startGamepadPolling();

    // Listen to keyboard events for virtual keyboard
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  ngOnDestroy(): void {
    this.leaderboardService.stop();
    if (this.gamepadPollInterval) {
      clearInterval(this.gamepadPollInterval);
    }
    window.removeEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  selectMode(mode: GameMode): void {
    this.selectedMode = mode;
  }

  isPlayerNameValid(): boolean {
    return this.playerName.trim().length > 0;
  }

  // Virtual Keyboard Methods
  focusNameInput(): void {
    this.keyboardVisible = true;
    this.menuFocusIndex = 1;
    this.selectedKeyIndex = 0;
    this.selectedRowIndex = 0;
  }

  closeKeyboard(): void {
    this.keyboardVisible = false;
    this.menuFocusIndex = 1;
  }

  addCharacter(char: string): void {
    if (this.playerName.length < 20) {
      this.playerName += char;
    }
  }

  deleteCharacter(): void {
    this.playerName = this.playerName.slice(0, -1);
  }

  navigateKeyboard(direction: string): void {
    if (!this.keyboardVisible) return;

    const rowLength = this.keyboardRows[this.selectedRowIndex].length;

    switch (direction) {
      case 'U':
        this.selectedRowIndex = Math.max(0, this.selectedRowIndex - 1);
        this.selectedKeyIndex = Math.min(
          this.selectedKeyIndex,
          this.keyboardRows[this.selectedRowIndex].length - 1
        );
        break;
      case 'D':
        this.selectedRowIndex = Math.min(
          this.keyboardRows.length - 1,
          this.selectedRowIndex + 1
        );
        this.selectedKeyIndex = Math.min(
          this.selectedKeyIndex,
          this.keyboardRows[this.selectedRowIndex].length - 1
        );
        break;
      case 'L':
        this.selectedKeyIndex = Math.max(0, this.selectedKeyIndex - 1);
        break;
      case 'R':
        this.selectedKeyIndex = Math.min(
          rowLength - 1,
          this.selectedKeyIndex + 1
        );
        break;
    }
  }

  selectKey(): void {
    if (this.keyboardVisible) {
      const key = this.keyboardRows[this.selectedRowIndex][this.selectedKeyIndex];
      if (key === '⌫') {
        this.deleteCharacter();
      } else {
        this.addCharacter(key);
      }
    }
  }

  // Gamepad Polling for Menu Navigation
  private startGamepadPolling(): void {
    let lastDirection = '';
    let directionHoldTime = 0;

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
          this.handleMenuDirection(currentDirection);
        }
      } else if (currentDirection && currentDirection !== lastDirection) {
        lastDirection = currentDirection;
        directionHoldTime = 0;
        this.handleMenuDirection(currentDirection);
      } else {
        lastDirection = '';
        directionHoldTime = 0;
      }

      // A Button (0) - Select
      if (gamepad.buttons[0]?.pressed) {
        this.handleMenuAction();
      }

      // B Button (1) - Back
      if (gamepad.buttons[1]?.pressed) {
        if (this.keyboardVisible) {
          this.closeKeyboard();
        }
      }
    }, 100);
  }

  private handleMenuDirection(direction: string): void {
    if (this.keyboardVisible) {
      this.navigateKeyboard(direction);
    } else {
      switch (direction) {
        case 'L':
        case 'U':
          this.selectedMode = this.selectedMode === 'classic' ? 'practice' : 'classic';
          break;
        case 'R':
        case 'D':
          this.selectedMode = this.selectedMode === 'classic' ? 'practice' : 'classic';
          break;
      }
    }
  }

  private handleMenuAction(): void {
    if (this.keyboardVisible) {
      this.selectKey();
    } else if (this.isPlayerNameValid()) {
      // Would trigger start game
      console.log('Starting game with player:', this.playerName);
    } else {
      // Open keyboard for name input
      this.focusNameInput();
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.keyboardVisible) return;

    const key = event.key.toUpperCase();

    if (key === 'BACKSPACE') {
      event.preventDefault();
      this.deleteCharacter();
    } else if (key === 'ARROWUP') {
      event.preventDefault();
      this.navigateKeyboard('U');
    } else if (key === 'ARROWDOWN') {
      event.preventDefault();
      this.navigateKeyboard('D');
    } else if (key === 'ARROWLEFT') {
      event.preventDefault();
      this.navigateKeyboard('L');
    } else if (key === 'ARROWRIGHT') {
      event.preventDefault();
      this.navigateKeyboard('R');
    } else if (key === 'ENTER') {
      event.preventDefault();
      this.selectKey();
    } else if (key === 'ESCAPE') {
      event.preventDefault();
      this.closeKeyboard();
    } else if (/^[A-Z0-9\-_@\s]$/.test(key)) {
      event.preventDefault();
      this.addCharacter(key);
    }
  }
}
