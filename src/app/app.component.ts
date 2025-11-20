import { Component } from '@angular/core';
import { GameCanvasComponent } from './game-canvas/game-canvas.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GameCanvasComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

}
