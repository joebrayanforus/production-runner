import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class InputService {
  private gamepads: (Gamepad | null)[] = [];

  // Track last direction to detect changes only
  private lastDirection: string | null = null;
  private lastActionButtonState = false;
  private lastBoostButtonState = false;
  private lastPauseButtonState = false;
  private lastLeftShoulderState = false;
  private lastRightShoulderState = false;
  private lastBackButtonState = false;

  // Debounce timer for direction changes
  private directionChangeTime = 0;
  private readonly DIRECTION_DEBOUNCE = 150; // ms

  constructor() {
    window.addEventListener('gamepadconnected', (e) => {
      console.log('🎮 Gamepad connected:', e.gamepad.id);
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      console.log('🎮 Gamepad disconnected:', e.gamepad.id);
    });
  }

  /**
   * Get direction but only when it changes (not when held)
   * Returns direction on change, null if no change
   */
  public getDirectionChange(): string | null {
    const currentDirection = this.getCurrentDirection();

    // Only return direction if it changed
    if (currentDirection !== this.lastDirection) {
      this.lastDirection = currentDirection;
      if (currentDirection) {
        this.directionChangeTime = Date.now();
        return currentDirection;
      }
    }

    return null;
  }

  /**
   * Get current direction (held state) - for continuous movement
   */
  public getDirection(): string | null {
    return this.getCurrentDirection();
  }

  /**
   * Internal method to read current joystick/dpad direction
   */
  private getCurrentDirection(): string | null {
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

  /**
   * Check if action/select button was just pressed (not held)
   * Button 0 (A button / Start button on arcade)
   */
  public isActionButtonPressed(): boolean {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let currentState = false;

    for (const gp of gamepads) {
      if (!gp) continue;
      // A button (button 0) - main action/select button
      if (gp.buttons[0]?.pressed) {
        currentState = true;
        break;
      }
    }

    // Return true only on press (not held)
    const justPressed = currentState && !this.lastActionButtonState;
    this.lastActionButtonState = currentState;
    return justPressed;
  }

  /**
   * Check if boost button was just pressed (not held)
   * Button 3 (Y button on gamepad)
   */
  public isBoostButtonPressed(): boolean {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let currentState = false;

    for (const gp of gamepads) {
      if (!gp) continue;
      // Y button (button 3) - boost button
      if (gp.buttons[3]?.pressed) {
        currentState = true;
        break;
      }
    }

    // Return true only on press (not held)
    const justPressed = currentState && !this.lastBoostButtonState;
    this.lastBoostButtonState = currentState;
    return justPressed;
  }

  /**
   * Check if boost button is currently held down
   */
  public isBoostButtonHeld(): boolean {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

    for (const gp of gamepads) {
      if (!gp) continue;
      // Y button (button 3) - boost button
      if (gp.buttons[3]?.pressed) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if pause button was just pressed
   */
  public isPauseButtonPressed(): boolean {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let currentState = false;

    for (const gp of gamepads) {
      if (!gp) continue;
      // Start/Menu button (usually 9)
      if (gp.buttons[9]?.pressed) {
        currentState = true;
        break;
      }
    }

    const justPressed = currentState && !this.lastPauseButtonState;
    this.lastPauseButtonState = currentState;
    return justPressed;
  }

  /**
   * Left shoulder button (L1/LB) - just pressed
   */
  public isLeftShoulderPressed(): boolean {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let currentState = false;

    for (const gp of gamepads) {
      if (!gp) continue;
      if (gp.buttons[4]?.pressed) {
        currentState = true;
        break;
      }
    }

    const justPressed = currentState && !this.lastLeftShoulderState;
    this.lastLeftShoulderState = currentState;
    return justPressed;
  }

  /**
   * Right shoulder button (R1/RB) - just pressed
   */
  public isRightShoulderPressed(): boolean {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let currentState = false;

    for (const gp of gamepads) {
      if (!gp) continue;
      if (gp.buttons[5]?.pressed) {
        currentState = true;
        break;
      }
    }

    const justPressed = currentState && !this.lastRightShoulderState;
    this.lastRightShoulderState = currentState;
    return justPressed;
  }

  /**
   * Back/View button - just pressed
   */
  public isBackButtonPressed(): boolean {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let currentState = false;

    for (const gp of gamepads) {
      if (!gp) continue;
      if (gp.buttons[8]?.pressed) {
        currentState = true;
        break;
      }
    }

    const justPressed = currentState && !this.lastBackButtonState;
    this.lastBackButtonState = currentState;
    return justPressed;
  }

  /**
   * Reset all button states (useful when changing screens)
   */
  public resetButtonStates(): void {
    this.lastActionButtonState = false;
    this.lastBoostButtonState = false;
    this.lastPauseButtonState = false;
    this.lastLeftShoulderState = false;
    this.lastRightShoulderState = false;
    this.lastBackButtonState = false;
    this.lastDirection = null;
  }
}
