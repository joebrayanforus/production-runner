import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class InputService {

  controllerIndex : number | null = null;
  LeftstickX : number = 0;
  LeftstickY : number = 0;
  deadZone : number = 0.15;

  constructor() { 
    // zeig an ,ob ein Gamepad verbunden ist oder nicht !
    window.addEventListener("gamepadconnected", (e) => {
      console.log("Gamepad connected:", e.gamepad);
      this.controllerIndex = e.gamepad.index;
    });

    window.addEventListener("gamepaddisconnected" , (e) => {
      console.log("disconnected:", e.gamepad);
      this.controllerIndex = null;   
     });

  }
  // basiert sich auf den Wert von dem Gamepad ,um die Achsenwerte zu aktualisieren
  public updateGamepad () : void { 

    if (this.controllerIndex !== null) {
      const gamepad = navigator.getGamepads()[this.controllerIndex];
      if (gamepad) {
          this.LeftstickX = gamepad.axes[0];
          this.LeftstickY = gamepad.axes[1];

          // Deadzone -Bereich ,in dem kleine Zone von Achsenwerte ignoriert werden 

          if (Math.abs(this.LeftstickX) < this.deadZone) {
            this.LeftstickX = 0;
          }
          if (Math.abs(this.LeftstickY) < this.deadZone) {
            this.LeftstickY = 0;
          }

      }
      
       
    }

  }
  // gibt die horizontale und vertikale Achsewerte zurück.
  
  gethorizontalAxis() : number {
    return this.LeftstickX;
  }
  getVerticalAxis() : number {
    return this.LeftstickY;
  }
}
