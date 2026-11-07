import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  private readonly controller = 'Subscription';
  private readonly env = `${environment.RpxDexApi}/${this.controller}`;

  private http = inject(HttpClient);

  public HasEarlyAccess(): Observable<boolean> {
    return this.http.get<boolean>(`${this.env}/earlyAccess`);
  }

  public GetAllUserPlanInfo(): Observable<boolean> {
    return this.http.get<boolean>(`${this.env}/allPlans`);
  }
}
