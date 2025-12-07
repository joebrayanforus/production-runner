import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { InputService } from '../services/input.service';
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
  private gamepadPollingId = 0;
  private aButtonPressed = false;

  constructor(private inputService: InputService, private router: Router) {}

  ngOnInit(): void {
    this.startGamepadPolling();
  }

  ngOnDestroy(): void {
    if (this.gamepadPollingId) {
      cancelAnimationFrame(this.gamepadPollingId);
    }
  }

  private startGamepadPolling(): void {
    const poll = () => {
      this.inputService.updateGamepad();
      const stickX = this.inputService.gethorizontalAxis();
      
      // Modus wechseln mit Stick (Links/Rechts)
      if (stickX > 0.5) {
        this.selectedMode = 'practice';
      } else if (stickX < -0.5) {
        this.selectedMode = 'classic';
      }

      // A-Button (Button 0) = drücken ,um das Spiel zu starten 
      const pads = navigator.getGamepads();
      if (pads && this.inputService.controllerIndex !== null) {
        const gamepad = pads[this.inputService.controllerIndex];
        if (gamepad && gamepad.buttons[0]) {
          if (gamepad.buttons[0].pressed && !this.aButtonPressed) {
            this.aButtonPressed = true;
            this.startGame();
          } else if (!gamepad.buttons[0].pressed) {
            this.aButtonPressed = false;
          }
        }
      }

      this.gamepadPollingId = requestAnimationFrame(poll);
    };
    this.gamepadPollingId = requestAnimationFrame(poll);
  }

  selectMode(mode: GameMode): void {
    this.selectedMode = mode;
  }

  private startGame(): void {
    this.router.navigate(['/game'], { queryParams: { mode: this.selectedMode } });
  }
}
