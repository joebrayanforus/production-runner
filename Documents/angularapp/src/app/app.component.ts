import { Component } from '@angular/core';
import { PlayerCardComponent } from './component/player-card/player-card.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PlayerCardComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'angularapp';

}
