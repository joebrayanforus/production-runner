
import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';

export interface LeaderboardEntry {
  rank: number;
  username: string;
  points: number;
  level: number;
  sensorsRepaired: number;
  achievedAt: string; 
}

@Injectable({
  providedIn: 'root'
})
export class LeaderboardService {

  private readonly apiBaseUrl = 'http://localhost:5019';

  private hubConnection?: signalR.HubConnection;

  private readonly leaderboardSubject =
    new BehaviorSubject<LeaderboardEntry[]>([]);
  readonly leaderboard$ = this.leaderboardSubject.asObservable();

  constructor(
    private http: HttpClient,
    private zone: NgZone
  ) {}

  start(): void {
    if (this.hubConnection) {
      return; 
    }

    this.reloadLeaderboard();

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${this.apiBaseUrl}/leaderboardHub`)
      .withAutomaticReconnect()
      .build();

    this.hubConnection.on('ReceiveNewScore', () => {
      this.zone.run(() => this.reloadLeaderboard());
    });

    this.hubConnection
      .start()
      .catch(err => console.error('SignalR connection error:', err));
  }

  stop(): void {
    this.hubConnection?.stop().catch(err =>
      console.error('SignalR stop error:', err)
    );
    this.hubConnection = undefined;
  }

  private reloadLeaderboard(): void {
    this.http
      .get<LeaderboardEntry[]>(
        `${this.apiBaseUrl}/api/scores/leaderboard?top=10`
      )
      .subscribe({
        next: entries => this.leaderboardSubject.next(entries),
        error: err => console.error('Failed to load leaderboard', err)
      });
  }
}
