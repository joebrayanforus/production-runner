import { Routes } from '@angular/router';
import { StartPageComponent } from './start-page/start-page.component';
import { GameCanvasComponent } from './game-canvas/game-canvas.component';

export const routes: Routes = [
  { path: '', component: StartPageComponent },      // Startseite
  { path: 'game', component: GameCanvasComponent }, // Phaser-Spiel
  { path: '**', redirectTo: '' }                    // Fallback
];
