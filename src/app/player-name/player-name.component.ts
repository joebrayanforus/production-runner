import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type GameMode = 'classic' | 'practice' | '2player';

@Component({
  selector: 'app-player-name',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './player-name.component.html',
  styleUrls: ['./player-name.component.css']
})
export class PlayerNameComponent implements OnInit, OnDestroy {
  playerName = '';
  player2Name = '';
  currentPlayer: 1 | 2 = 1;
  gameMode: GameMode = 'classic';
  is2PlayerMode = false;

  // Virtual Keyboard Variables
  keyboardVisible = true; // Always show keyboard on this page
  keyboardRows: string[][] = [
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
    ['K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'],
    ['U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3'],
    ['4', '5', '6', '7', '8', '9', '-', '_', '@', ' ']
  ];
  selectedKeyIndex = 0;
  selectedRowIndex = 0;
  focusArea: 'keyboard' | 'buttons' = 'keyboard';
  buttonIndex = 0; // 0 delete, 1 start, 2 back

  private gamepadPollInterval: any;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get game mode from route params
    this.route.queryParams.subscribe(params => {
      this.gameMode = params['mode'] || 'classic';
      this.is2PlayerMode = this.gameMode === '2player';
    });

    // Start gamepad polling for keyboard navigation
    this.startGamepadPolling();

    // Listen to keyboard events
    this.boundKeyHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
    window.addEventListener('keydown', this.boundKeyHandler);
  }

  ngOnDestroy(): void {
    if (this.gamepadPollInterval) {
      clearInterval(this.gamepadPollInterval);
    }
    if (this.boundKeyHandler) {
      window.removeEventListener('keydown', this.boundKeyHandler);
    }
  }

  isPlayerNameValid(): boolean {
    if (!this.is2PlayerMode) {
      return this.playerName.trim().length > 0;
    }
    return this.currentPlayer === 1
      ? this.playerName.trim().length > 0
      : this.playerName.trim().length > 0 && this.player2Name.trim().length > 0;
  }

  getCurrentName(): string {
    return this.currentPlayer === 1 ? this.playerName : this.player2Name;
  }

  setCurrentName(value: string): void {
    if (this.currentPlayer === 1) {
      this.playerName = value;
    } else {
      this.player2Name = value;
    }
  }

  addCharacter(char: string): void {
    const currentName = this.getCurrentName();
    if (currentName.length < 20) {
      this.setCurrentName(currentName + char);
    }
  }

  deleteCharacter(): void {
    const currentName = this.getCurrentName();
    this.setCurrentName(currentName.slice(0, -1));
  }

  navigateKeyboard(direction: string): void {
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
    const key = this.keyboardRows[this.selectedRowIndex][this.selectedKeyIndex];
    if (key === '⌫') {
      this.deleteCharacter();
    } else {
      this.addCharacter(key);
    }
  }

  startGame(): void {
    if (!this.isPlayerNameValid()) return;

    if (this.is2PlayerMode && this.currentPlayer === 1) {
      // Passer au deuxième joueur
      this.currentPlayer = 2;
      return;
    }

    // Démarrer le jeu
    const queryParams: any = {
      mode: this.gameMode,
      playerName: this.playerName.trim()
    };

    if (this.is2PlayerMode) {
      queryParams.player2Name = this.player2Name.trim();
    }

    this.router.navigate(['/game'], { queryParams });
  }

  goBackToPlayer1(): void {
    if (this.is2PlayerMode && this.currentPlayer === 2) {
      this.currentPlayer = 1;
    }
  }

  goBack(): void {
    if (this.is2PlayerMode && this.currentPlayer === 2) {
      this.goBackToPlayer1();
    } else {
      this.router.navigate(['/']);
    }
  }

  // Gamepad Polling
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
          this.navigateKeyboard(currentDirection);
        }
      } else if (currentDirection && currentDirection !== lastDirection) {
        lastDirection = currentDirection;
        directionHoldTime = 0;
        this.navigateKeyboard(currentDirection);
      } else {
        lastDirection = '';
        directionHoldTime = 0;
      }

      // A Button (0) - Select
      if (gamepad.buttons[0]?.pressed) {
        this.selectKey();
      }

      // B Button (1) - Go back
      if (gamepad.buttons[1]?.pressed) {
        this.goBack();
      }

      // Start Button (9) - Start game
      if (gamepad.buttons[9]?.pressed && this.isPlayerNameValid()) {
        this.startGame();
      }
    }, 100);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const key = event.key.toUpperCase();

    if (key === 'ESCAPE') {
      event.preventDefault();
      this.goBack();
      return;
    }

    if (this.focusArea === 'keyboard') {
      if (key === 'BACKSPACE') {
        event.preventDefault();
        this.deleteCharacter();
      } else if (key === 'ARROWUP') {
        event.preventDefault();
        this.navigateKeyboard('U');
      } else if (key === 'ARROWDOWN') {
        event.preventDefault();
        // wenn letzte Zeile -> Buttons fokussieren
        if (this.selectedRowIndex === this.keyboardRows.length - 1) {
          this.focusArea = 'buttons';
          this.buttonIndex = 1; // default auf Start
        } else {
          this.navigateKeyboard('D');
        }
      } else if (key === 'ARROWLEFT') {
        event.preventDefault();
        this.navigateKeyboard('L');
      } else if (key === 'ARROWRIGHT') {
        event.preventDefault();
        this.navigateKeyboard('R');
      } else if (key === 'ENTER') {
        event.preventDefault();
        this.selectKey();
      } else if (key === ' ') {
        event.preventDefault();
        this.addCharacter(' ');
      } else if (/^[A-Z0-9\-_@]$/.test(key)) {
        event.preventDefault();
        this.addCharacter(key);
      }
    } else {
      // Buttons fokussiert
      if (key === 'ARROWLEFT') {
        event.preventDefault();
        this.buttonIndex = Math.max(0, this.buttonIndex - 1);
      } else if (key === 'ARROWRIGHT') {
        event.preventDefault();
        this.buttonIndex = Math.min(2, this.buttonIndex + 1);
      } else if (key === 'ARROWUP') {
        event.preventDefault();
        this.focusArea = 'keyboard';
      } else if (key === 'ENTER' || key === ' ') {
        event.preventDefault();
        this.triggerButton();
      }
    }
  }

  private triggerButton() {
    switch (this.buttonIndex) {
      case 0:
        this.deleteCharacter();
        break;
      case 1:
        if (this.isPlayerNameValid()) {
          this.startGame();
        }
        break;
      case 2:
        this.goBack();
        break;
    }
  }

  boundKeyHandler?: (e: KeyboardEvent) => void;
}
