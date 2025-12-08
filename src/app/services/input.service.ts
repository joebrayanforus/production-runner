import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class InputService {
  private gamepads: (Gamepad | null)[] = [];

  constructor() {
    window.addEventListener('gamepadconnected', (e) => {
      console.log('🎮 Gamepad connected:', e.gamepad.id);
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      console.log('🎮 Gamepad disconnected:', e.gamepad.id);
    });
  }

  public getDirection(): string | null {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

    for (const gp of gamepads) {
      if (!gp) continue;

      // Stick Axis (Standard Layout: Axis 0 = Left Stick X, Axis 1 = Left Stick Y)
      const x = gp.axes[0];
      const y = gp.axes[1];
      const threshold = 0.5;

      // D-Pad Buttons (Standard Layout: 12=Up, 13=Down, 14=Left, 15=Right)
      const up = gp.buttons[12]?.pressed;
      const down = gp.buttons[13]?.pressed;
      const left = gp.buttons[14]?.pressed;
      const right = gp.buttons[15]?.pressed;

      if (y < -threshold || up) return 'U';
      if (y > threshold || down) return 'D';
      if (x < -threshold || left) return 'L';
      if (x > threshold || right) return 'R';
    }
    return null;
  }

  public isActionButtonPressed(): boolean {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of gamepads) {
      if (!gp) continue;
      // Check common action buttons (A, B, X, Y -> 0, 1, 2, 3)
      if (gp.buttons[0]?.pressed || gp.buttons[1]?.pressed || gp.buttons[2]?.pressed || gp.buttons[3]?.pressed) {
        return true;
      }
    }
    return false;
  }

  public isPauseButtonPressed(): boolean {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of gamepads) {
      if (!gp) continue;
      // Start/Select/Menu (usually 9 or 8)
      if (gp.buttons[9]?.pressed || gp.buttons[8]?.pressed) {
        return true;
      }
    }
    return false;
  }
}
