import { Component } from '@angular/core';
import {CommonModule} from '@angular/common';
import {Input} from '@angular/core';
@Component({
  selector: 'app-player-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-card.component.html',
  styleUrl: './player-card.component.scss'
})
export class PlayerCardComponent {
    @Input()name: string = '';
    @Input()punktestand: number = 0;
    @Input()rows: number = 5;
    @Input()cols: number = 5;
    posX: number = 0;
    posY: number = 0;
    increasescore(){
      this.punktestand +=1;
    }

    decreasescore(){
      this.punktestand -=1;
    }
    move(dx:number, dy:number){
      const newX=this.posX + dx;
      const newY=this.posY + dy;
      if(newX>=0 && newX<this.cols && newY>=0 && newY<this.rows){
        this.posX = newX;
        this.posY = newY;
      }
    }
}
