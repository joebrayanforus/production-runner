import { Routes } from '@angular/router';
import { StartPageComponent } from './start-page/start-page.component';
import { PlayerNameComponent } from './player-name/player-name.component';
import { GameCanvasComponent } from './game-canvas/game-canvas.component';
import { InfoComponent } from './info/info.component';
import { PresentationComponent } from './presentation/presentation.component';

export const routes: Routes = [
  { path: '', component: StartPageComponent },        // Startseite (mode selection)
  { path: 'presentation', component: PresentationComponent }, // Présentation du jeu
  { path: 'player-name', component: PlayerNameComponent }, // Player name input
  { path: 'game', component: GameCanvasComponent },   // Game
  { path: 'info', component: InfoComponent },         // Info-Seite (About & Sensors)
  { path: '**', redirectTo: '' }                      // Fallback

];
