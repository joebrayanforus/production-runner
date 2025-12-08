import { Routes } from '@angular/router';
import { StartPageComponent } from './start-page/start-page.component';
import { GameCanvasComponent } from './game-canvas/game-canvas.component';
import { InfoComponent } from './info/info.component';

export const routes: Routes = [
  { path: '', component: StartPageComponent },      // Startseite
  { path: 'game', component: GameCanvasComponent }, // Phaser-Spiel
  { path: 'info', component: InfoComponent },       // Info-Seite (About & Sensors)
  { path: '**', redirectTo: '' }                    // Fallback

];
