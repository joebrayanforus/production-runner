import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputService } from '../services/input.service';

export type GameMode = 'classic' | 'practice';

@Component({
  selector: 'app-player-name',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './player-name.component.html',
  styleUrls: ['./player-name.component.css']
})
export class PlayerNameComponent implements OnInit, OnDestroy {
  playerName = '';
  playerName2 = '';
  currentPlayerInput: 1 | 2 = 1; // Quel joueur saisit son nom
  gameMode: GameMode = 'classic';
  target: 'game' | 'boss' = 'game';
  players: string | null = null;
  numberOfPlayers: 1 | 2 = 1;
  currentStep: 'players' | 'name' = 'players';

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
    private route: ActivatedRoute,
    private inputService: InputService
  ) {}

  ngOnInit(): void {
    // Get game mode from route params
    this.route.queryParams.subscribe(params => {
      this.gameMode = params['mode'] === 'practice' ? 'practice' : 'classic';
      this.players = params['players'] || null;
      if (this.players === '2') {
        this.numberOfPlayers = 2;
        this.currentStep = 'name';
      }
    });

    // Commencer par la sélection du nombre de joueurs
    this.currentStep = 'players';
    this.focusArea = 'buttons';
    this.buttonIndex = 0;

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
    if (this.numberOfPlayers === 1) {
      return this.playerName.trim().length > 0;
    } else {
      return this.playerName.trim().length > 0 && this.playerName2.trim().length > 0;
    }
  }

  isCurrentPlayerNameValid(): boolean {
    if (this.currentPlayerInput === 1) {
      return this.playerName.trim().length > 0;
    } else {
      return this.playerName2.trim().length > 0;
    }
  }

  getCurrentPlayerName(): string {
    return this.currentPlayerInput === 1 ? this.playerName : this.playerName2;
  }

  addCharacter(char: string): void {
    if (this.currentPlayerInput === 1) {
      if (this.playerName.length < 20) {
        this.playerName += char;
      }
    } else {
      if (this.playerName2.length < 20) {
        this.playerName2 += char;
      }
    }
  }

  deleteCharacter(): void {
    if (this.currentPlayerInput === 1) {
      this.playerName = this.playerName.slice(0, -1);
    } else {
      this.playerName2 = this.playerName2.slice(0, -1);
    }
  }

  navigateKeyboard(direction: string): void {
    if (this.currentStep === 'players') {
      // Navigation pour la sélection du nombre de joueurs
      if (direction === 'L') {
        this.buttonIndex = 0; // 1 joueur
      } else if (direction === 'R') {
        this.buttonIndex = 1; // 2 joueurs
      }
      return;
    }

    if (this.focusArea === 'buttons') {
      // Navigation within buttons
      switch (direction) {
        case 'L':
          this.buttonIndex = Math.max(0, this.buttonIndex - 1);
          break;
        case 'R':
          this.buttonIndex = Math.min(2, this.buttonIndex + 1);
          break;
        case 'U':
            // Move from buttons back to keyboard (last row)
            this.focusArea = 'keyboard';
            this.selectedRowIndex = this.keyboardRows.length - 1;
            // Map buttons back to corresponding columns on the last row
            if (this.buttonIndex === 0) {
              // Delete -> column 3 ("7")
              this.selectedKeyIndex = 3;
            } else if (this.buttonIndex === 1) {
              // Start -> column 5 ("9")
              this.selectedKeyIndex = 5;
            } else if (this.buttonIndex === 2) {
              // Back -> column 6 ("-")
              this.selectedKeyIndex = 6;
            } else {
              if (this.selectedKeyIndex < 0) this.selectedKeyIndex = 0;
            }
            // Keep within bounds
            this.selectedKeyIndex = Math.min(
              this.selectedKeyIndex,
              this.keyboardRows[this.selectedRowIndex].length - 1
            );
          break;
        case 'D':
          // Already at buttons, do nothing
          break;
      }
      return;
    }

    // Navigation within keyboard
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
        // If on last row, move to buttons
        if (this.selectedRowIndex === this.keyboardRows.length - 1) {
          this.focusArea = 'buttons';
          // Map last-row columns to specific buttons:
          // columns 0-3 (4,5,6,7) -> Delete (0)
          // columns 4-5 (8,9) -> Start (1)
          // columns 6-9 (-,_,@, ) -> Back (2)
          const col = this.selectedKeyIndex;
          if (col >= 0 && col <= 3) {
            this.buttonIndex = 0; // Delete
          } else if (col >= 4 && col <= 5) {
            this.buttonIndex = 1; // Start
          } else {
            this.buttonIndex = 2; // Back
          }
          // Reset keyboard selection to clear highlight
          this.selectedRowIndex = -1;
          this.selectedKeyIndex = -1;
        } else {
          this.selectedRowIndex = Math.min(
            this.keyboardRows.length - 1,
            this.selectedRowIndex + 1
          );
          this.selectedKeyIndex = Math.min(
            this.selectedKeyIndex,
            this.keyboardRows[this.selectedRowIndex].length - 1
          );
        }
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

  selectNumberOfPlayers(num: 1 | 2): void {
    this.numberOfPlayers = num;
  }

  startGame(): void {
    if (this.currentStep === 'players') {
      // Passer à la saisie du nom
      this.currentStep = 'name';
      this.focusArea = 'keyboard';
      this.selectedRowIndex = 0;
      this.selectedKeyIndex = 0;
      this.currentPlayerInput = 1;
    } else if (this.currentStep === 'name') {
      // Si 2 joueurs et on n'a que le premier nom
      if (this.numberOfPlayers === 2 && this.currentPlayerInput === 1 && this.playerName.trim().length > 0) {
        this.currentPlayerInput = 2;
        this.focusArea = 'keyboard';
        this.selectedRowIndex = 0;
        this.selectedKeyIndex = 0;
      } else if (this.isPlayerNameValid()) {
        // Démarrer le jeu
        const queryParams: any = {
          mode: this.gameMode,
          playerName: this.playerName.trim()
        };
        if (this.numberOfPlayers === 2) {
          queryParams.players = '2';
          queryParams.playerName2 = this.playerName2.trim();
        }
        this.router.navigate(['/game'], { queryParams });
      }
    }
  }

  goBack(): void {
    if (this.currentStep === 'name' && this.numberOfPlayers === 2 && this.currentPlayerInput === 2) {
      // Retour au joueur 1
      this.currentPlayerInput = 1;
      this.playerName2 = '';
      this.focusArea = 'keyboard';
      this.selectedRowIndex = 0;
      this.selectedKeyIndex = 0;
    } else if (this.currentStep === 'name') {
      // Retour à la sélection du nombre de joueurs
      this.currentStep = 'players';
      this.focusArea = 'buttons';
      this.buttonIndex = this.numberOfPlayers === 1 ? 0 : 1;
      this.playerName = '';
      this.playerName2 = '';
      this.currentPlayerInput = 1;
    } else {
      // Retour à la page d'accueil
      this.router.navigate(['/']);
    }
  }

  // Gamepad Polling
  private startGamepadPolling(): void {
    let lastDirection = '';
    let directionHoldTime = 0;

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

      // Arcade Select button (Button 10) or standard A Button (0) - Select
      if (this.inputService.isArcadeSelectPressed() || this.inputService.isActionButtonPressed()) {
        if (this.focusArea === 'buttons') {
          this.triggerButton();
        } else {
          this.selectKey();
        }
      }

      // Arcade Back button (Button 11) or standard B Button (1) - Go back
      if (this.inputService.isArcadeBackPressed()) {
        this.goBack();
      }

      // Arcade Start button (Button 9) - Start game
      if (this.inputService.isArcadeStartPressed() && this.isPlayerNameValid()) {
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

    if (key === 'BACKSPACE') {
      event.preventDefault();
      if (this.focusArea === 'buttons' && this.buttonIndex === 0) {
        this.deleteCharacter();
      } else if (this.focusArea === 'keyboard') {
        this.deleteCharacter();
      }
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
    } else if (key === 'ENTER' || key === ' ') {
      event.preventDefault();
      if (this.focusArea === 'buttons') {
        this.triggerButton();
      } else {
        if (key === ' ') {
          this.addCharacter(' ');
        } else {
          this.selectKey();
        }
      }
    } else if (this.focusArea === 'keyboard' && /^[A-Z0-9\-_@]$/.test(key)) {
      event.preventDefault();
      this.addCharacter(key);
    }
  }

  private triggerButton() {
    if (this.currentStep === 'players') {
      // Sur l'écran de sélection des joueurs
      if (this.buttonIndex === 0) {
        this.numberOfPlayers = 1;
        this.startGame(); // Passe à la saisie du nom
      } else if (this.buttonIndex === 1) {
        this.numberOfPlayers = 2;
        this.startGame(); // Passe à la saisie des noms
      }
    } else {
      // Sur l'écran de saisie du nom
      switch (this.buttonIndex) {
        case 0:
          this.deleteCharacter();
          break;
        case 1:
          if (this.numberOfPlayers === 2 && this.currentPlayerInput === 1 && this.playerName.trim().length > 0) {
            this.startGame(); // Passe au joueur 2
          } else if (this.isCurrentPlayerNameValid()) {
            this.startGame(); // Démarre le jeu ou passe au joueur 2
          }
          break;
        case 2:
          this.goBack();
          break;
      }
    }
  }

  boundKeyHandler?: (e: KeyboardEvent) => void;
}
