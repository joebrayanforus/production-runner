# Arcade Controller Configuration Guide

## Overview
The Production Runner game supports arcade cabinets with dual-player controllers. Each controller has 6 buttons arranged in 2 rows of 3 buttons.

## Button Layout

### Each Arcade Controller
```
Top Row:      4(L)      0(X)      5(R)
Bottom Row:   3(Y)      2(B)      1(A)
```

### Button Mapping Reference
| Button # | Button Label | Position |
|-----------|--------------|----------|
| 4 | L (Left) | Top Left |
| 0 | X (Center) | Top Center |
| 5 | R (Right) | Top Right |
| 3 | Y (Yellow) | Bottom Left |
| 2 | B (Blue) | Bottom Center |
| 1 | A (Red) | Bottom Right |

## Game Controls

### Player 1 (First Controller / Gamepad 0)

#### Movement
- **Arrow Keys** (on keyboard) or **Joystick**

#### Boost Activation
The boost is activated using **any of these**:
- **Ctrl Key** (keyboard)
- **Button 4 (L)** - Top Left
- **Button 3 (Y)** - Bottom Left

### Player 2 (Second Controller / Gamepad 1) - 2-Player Mode Only

#### Movement
- **WASD Keys** (on keyboard) or **Joystick**

#### Boost Activation
The boost is activated using **any of these**:
- **Shift Key** (keyboard)
- **Button 4 (L)** - Top Left
- **Button 3 (Y)** - Bottom Left

### Back / Exit (Cabinet or Gamepad 0)

Wire a dedicated **Back** or **Exit** button on your arcade cabinet to **Gamepad Button 8** (View/Select on standard gamepads). It behaves like the **Escape** key:

- **Name entry screen**: Go back (or back to Player 1 in 2-player)
- **During game / Boss fight**: Open pause menu; press again to resume
- **Game over**: Open pause/exit menu
- **SPIELANLEITUNG (instructions)**: Close instructions overlay

If your cabinet has no Button 8, you can still use **Button 1 (B)** on the name entry screen to go back.

## Implementation Details

### Arcade Button to Gamepad Button Mapping
The arcade buttons are mapped to standard gamepad button indices:
- Arcade Button 4 (L) → Gamepad Button 4
- Arcade Button 3 (Y) → Gamepad Button 3
- Arcade Button 0 (X) → Gamepad Button 0
- Arcade Button 5 (R) → Gamepad Button 5
- Arcade Button 2 (B) → Gamepad Button 2
- Arcade Button 1 (A) → Gamepad Button 1

### Boost Logic
The game polls for arcade button presses every frame:

```typescript
// Player 1 Boost (Gamepad 0)
// Activated by: Ctrl Key OR Button 4 OR Button 3
const gp1 = gamepads[0];
const arcadeBoostP1 = gp1.buttons[4]?.pressed || gp1.buttons[3]?.pressed;

// Player 2 Boost (Gamepad 1)
// Activated by: Shift Key OR Button 4 OR Button 3
const gp2 = gamepads[1];
const arcadeBoostP2 = gp2.buttons[4]?.pressed || gp2.buttons[3]?.pressed;
```

## Modified Files

The following files were updated to support arcade controller boost functionality:

1. **src/app/game-canvas/game-canvas.component.ts**
   - Added arcade button detection for Player 1 and Player 2 boost
   - Lines 2579-2624: Boost activation logic

2. **src/app/boss-fight/boss-fight.component.ts**
   - Added arcade button detection for boost
   - Lines 2271-2289: Boost activation logic

## Testing the Arcade Setup

To test the arcade controllers with your game:

1. Connect both arcade controllers to your laptop via USB (typically as Gamepad 0 and Gamepad 1)
2. Launch the game
3. In 2-player mode, test:
   - **Player 1**: Press Button 4 (L) or Button 3 (Y) to activate boost
   - **Player 2**: Press Button 4 (L) or Button 3 (Y) on the second controller to activate boost
4. The boost should activate when you have energy and will deplete the energy bar

## Troubleshooting

### Arcade Controllers Not Detected
- Ensure controllers are connected via USB
- Check browser console (F12) for gamepad connection messages
- Try refreshing the page
- Some browsers may require the page to have focus for gamepad input

### Boost Not Working
- Verify you have sufficient boost energy (check energy gauge at bottom of screen)
- Ensure you're not in Practice mode (boost disabled in Practice)
- Check that the correct controller (0 or 1) is being used

### Mixed Input
- You can use both keyboard and arcade controls simultaneously
- Arcade buttons are checked first and take priority
- The keyboard controls (Ctrl/Shift) are still functional as fallback

## Game Modes

### Classic Mode (1 Player)
- Uses Player 1 (Gamepad 0)
- Boost available with Ctrl or Arcade Buttons 4/3

### 2-Player Mode
- Uses both Gamepad 0 (Player 1) and Gamepad 1 (Player 2)
- Each player has independent boost energy
- Player 1: Ctrl or Arcade Buttons 4/3
- Player 2: Shift or Arcade Buttons 4/3

### Practice/Simulation Mode
- Boost is disabled
- Used for training without time pressure
