
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
      this.zone.run(() => {
        console.log('📢 SignalR: ReceiveNewScore event received, reloading leaderboard...');
        this.reloadLeaderboard();
      });
    });

    this.hubConnection.on('LeaderboardUpdated', (leaderboard: any[]) => {
      this.zone.run(() => {
        console.log('📢 SignalR: LeaderboardUpdated event received', leaderboard);
        // Map PascalCase to camelCase if needed
        const mapped = leaderboard.map((entry: any) => ({
          rank: entry.Rank ?? entry.rank,
          username: entry.Username ?? entry.username,
          points: entry.Points ?? entry.points,
          level: entry.Level ?? entry.level,
          sensorsRepaired: entry.SensorsRepaired ?? entry.sensorsRepaired,
          achievedAt: entry.AchievedAt ?? entry.achievedAt
        }));
        console.log('📊 Mapped leaderboard:', mapped);
        this.leaderboardSubject.next(mapped);
      });
    });

    this.hubConnection
      .start()
      .then(() => {
        console.log('✅ SignalR connected to leaderboard hub');
      })
      .catch(err => console.error('❌ SignalR connection error:', err));
  }

  stop(): void {
    this.hubConnection?.stop().catch(err =>
      console.error('SignalR stop error:', err)
    );
    this.hubConnection = undefined;
  }

  private reloadLeaderboard(): void {
    this.http
      .get<any[]>(
        `${this.apiBaseUrl}/api/scores/leaderboard?top=10`
      )
      .subscribe({
        next: entries => {
          console.log('📊 Leaderboard loaded:', entries);
          // Map PascalCase properties from backend to camelCase for frontend
          const mapped = entries.map(entry => ({
            rank: entry.Rank || entry.rank,
            username: entry.Username || entry.username,
            points: entry.Points || entry.points,
            level: entry.Level || entry.level,
            sensorsRepaired: entry.SensorsRepaired || entry.sensorsRepaired,
            achievedAt: entry.AchievedAt || entry.achievedAt
          }));
          this.leaderboardSubject.next(mapped);
        },
        error: err => {
          console.error('❌ Failed to load leaderboard', err);
          console.error('Error details:', JSON.stringify(err, null, 2));
        }
      });
  }
}
