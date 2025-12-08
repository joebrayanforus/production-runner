import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ScoreService {
  
  private readonly apiBaseUrl = 'http://localhost:5001/api/scores';

  constructor(private http: HttpClient) {}

  submitScore(dto: any): Observable<any> {
    return this.http.post(this.apiBaseUrl, dto);
  }
}
