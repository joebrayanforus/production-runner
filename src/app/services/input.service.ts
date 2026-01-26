import { Injectable } from '@angular/core';

// Arcade Button Mapping Configuration
export interface ArcadeButtonMapping {
  // Joystick directions (D-Pad buttons)
  joystickUp: number;      // Default: 12
  joystickDown: number;    // Default: 13
  joystickLeft: number;    // Default: 14
  joystickRight: number;   // Default: 15
  
  // Player movement buttons (fallback if joystick not detected)
  player1Up: number;      // Default: 0
  player1Down: number;     // Default: 1
  player1Left: number;     // Default: 2
  player1Right: number;    // Default: 3
  player2Up: number;       // Default: 4
  player2Down: number;     // Default: 5
  player2Left: number;     // Default: 6
  player2Right: number;    // Default: 7
  
  // Game control buttons
  pause: number;           // Default: 8
  start: number;           // Default: 9
  select: number;          // Default: 10
  back: number;            // Default: 11
  boost: number;           // Default: 12
  help: number;            // Default: 13
  reserved1: number;       // Default: 14
  reserved2: number;       // Default: 15
}

@Injectable({
  providedIn: 'root'
})
export class InputService {
  private gamepads: (Gamepad | null)[] = [];
  private debugMode = false;
  
  // Default arcade button mapping
  private arcadeMapping: ArcadeButtonMapping = {
    // Joystick D-Pad (standard gamepad layout)
    joystickUp: 12,
    joystickDown: 13,
    joystickLeft: 14,
    joystickRight: 15,
    
    // Player movement buttons (fallback)
    player1Up: 0,
    player1Down: 1,
    player1Left: 2,
    player1Right: 3,
    player2Up: 4,
    player2Down: 5,
    player2Left: 6,
    player2Right: 7,
    
    // Game control buttons
    pause: 8,
    start: 9,
    select: 10,
    back: 11,
    boost: 12,
    help: 13,
    reserved1: 14,
    reserved2: 15
  };

  // Track last direction to detect changes only
  private lastDirection: string | null = null;
  private lastActionButtonState = false;
  private lastBoostButtonState = false;
  private lastPauseButtonState = false;
  private lastSelectButtonState = false;
  private lastLeftShoulderState = false;
  private lastRightShoulderState = false;
  private lastBackButtonState = false;

  // Debounce timer for direction changes
  private directionChangeTime = 0;
  private readonly DIRECTION_DEBOUNCE = 150; // ms

  constructor() {
    window.addEventListener('gamepadconnected', (e) => {
      console.log('🎮 Gamepad connected:', e.gamepad.id);
      if (this.debugMode) {
        console.log('🎮 Gamepad buttons:', e.gamepad.buttons.length);
        console.log('🎮 Gamepad axes:', e.gamepad.axes.length);
      }
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
   * Checks both Start (button 9) and Select (button 10) buttons
   */
  public isPauseButtonPressed(): boolean {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let currentState = false;

    for (const gp of gamepads) {
      if (!gp) continue;
      // Start/Menu button (button 9) OR Select button (button 10)
      if (gp.buttons[9]?.pressed || gp.buttons[10]?.pressed) {
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
    this.lastSelectButtonState = false;
    this.lastLeftShoulderState = false;
    this.lastRightShoulderState = false;
    this.lastBackButtonState = false;
    this.lastDirection = null;
  }

  // ============================================================================
  // ARCADE-SPECIFIC METHODS
  // ============================================================================

  /**
   * Get direction from arcade joystick for specified player
   * @param player Player number (1 or 2)
   * @returns Direction string ('U', 'D', 'L', 'R') or null
   */
  public getArcadeDirection(player: 1 | 2): string | null {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gamepadIndex = player === 1 ? 0 : 1;
    const gp = gamepads[gamepadIndex];
    
    if (!gp) return null;

    // Try joystick D-Pad first (microswitch joysticks appear as buttons)
    const up = gp.buttons[this.arcadeMapping.joystickUp]?.pressed;
    const down = gp.buttons[this.arcadeMapping.joystickDown]?.pressed;
    const left = gp.buttons[this.arcadeMapping.joystickLeft]?.pressed;
    const right = gp.buttons[this.arcadeMapping.joystickRight]?.pressed;

    if (up) return 'U';
    if (down) return 'D';
    if (left) return 'L';
    if (right) return 'R';

    // Fallback: Try analog stick if available (for compatibility)
    if (gp.axes.length >= 2) {
      const x = gp.axes[0];
      const y = gp.axes[1];
      const threshold = 0.5;

      if (y < -threshold) return 'U';
      if (y > threshold) return 'D';
      if (x < -threshold) return 'L';
      if (x > threshold) return 'R';
    }

    // Fallback: Try player movement buttons
    if (player === 1) {
      if (gp.buttons[this.arcadeMapping.player1Up]?.pressed) return 'U';
      if (gp.buttons[this.arcadeMapping.player1Down]?.pressed) return 'D';
      if (gp.buttons[this.arcadeMapping.player1Left]?.pressed) return 'L';
      if (gp.buttons[this.arcadeMapping.player1Right]?.pressed) return 'R';
    } else {
      if (gp.buttons[this.arcadeMapping.player2Up]?.pressed) return 'U';
      if (gp.buttons[this.arcadeMapping.player2Down]?.pressed) return 'D';
      if (gp.buttons[this.arcadeMapping.player2Left]?.pressed) return 'L';
      if (gp.buttons[this.arcadeMapping.player2Right]?.pressed) return 'R';
    }

    return null;
  }

  /**
   * Check if a specific arcade button is pressed
   * @param buttonIndex Button index (0-15)
   * @param player Optional player number (1 or 2), defaults to Player 1
   * @returns True if button is pressed
   */
  public isArcadeButtonPressed(buttonIndex: number, player: 1 | 2 = 1): boolean {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gamepadIndex = player === 1 ? 0 : 1;
    const gp = gamepads[gamepadIndex];
    
    if (!gp || buttonIndex < 0 || buttonIndex >= gp.buttons.length) {
      return false;
    }

    const pressed = gp.buttons[buttonIndex]?.pressed || false;
    
    if (this.debugMode && pressed) {
      console.log(`🎮 Arcade Button ${buttonIndex} pressed (Player ${player})`);
    }

    return pressed;
  }

  /**
   * Get current arcade button mapping configuration
   * @returns Current button mapping
   */
  public getArcadeButtonMapping(): ArcadeButtonMapping {
    return { ...this.arcadeMapping };
  }

  /**
   * Set custom arcade button mapping
   * @param mapping Custom button mapping (partial - only specified values will be updated)
   */
  public setArcadeButtonMapping(mapping: Partial<ArcadeButtonMapping>): void {
    this.arcadeMapping = { ...this.arcadeMapping, ...mapping };
    if (this.debugMode) {
      console.log('🎮 Arcade button mapping updated:', this.arcadeMapping);
    }
  }

  /**
   * Check if arcade pause button is pressed
   */
  public isArcadePausePressed(): boolean {
    return this.isArcadeButtonPressed(this.arcadeMapping.pause);
  }

  /**
   * Check if arcade start button is pressed
   */
  public isArcadeStartPressed(): boolean {
    return this.isArcadeButtonPressed(this.arcadeMapping.start);
  }

  /**
   * Check if arcade select/confirm button is pressed
   */
  public isArcadeSelectPressed(): boolean {
    return this.isArcadeButtonPressed(this.arcadeMapping.select);
  }

  /**
   * Check if arcade back/cancel button is pressed
   */
  public isArcadeBackPressed(): boolean {
    return this.isArcadeButtonPressed(this.arcadeMapping.back);
  }

  /**
   * Check if arcade boost button is pressed
   */
  public isArcadeBoostPressed(): boolean {
    return this.isArcadeButtonPressed(this.arcadeMapping.boost);
  }

  /**
   * Check if arcade help button is pressed
   */
  public isArcadeHelpPressed(): boolean {
    return this.isArcadeButtonPressed(this.arcadeMapping.help);
  }

  /**
   * Enable/disable debug mode for button testing
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    console.log(`🎮 Arcade debug mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Get all currently pressed buttons for debugging
   * @param player Player number (1 or 2)
   * @returns Array of pressed button indices
   */
  public getPressedButtons(player: 1 | 2 = 1): number[] {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gamepadIndex = player === 1 ? 0 : 1;
    const gp = gamepads[gamepadIndex];
    
    if (!gp) return [];

    const pressed: number[] = [];
    for (let i = 0; i < gp.buttons.length; i++) {
      if (gp.buttons[i]?.pressed) {
        pressed.push(i);
      }
    }
    return pressed;
  }

  /**
   * Get gamepad info for debugging
   * @param player Player number (1 or 2)
   * @returns Gamepad info object
   */
  public getGamepadInfo(player: 1 | 2 = 1): { id: string; buttons: number; axes: number } | null {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gamepadIndex = player === 1 ? 0 : 1;
    const gp = gamepads[gamepadIndex];
    
    if (!gp) return null;

    return {
      id: gp.id,
      buttons: gp.buttons.length,
      axes: gp.axes.length
    };
  }
}
