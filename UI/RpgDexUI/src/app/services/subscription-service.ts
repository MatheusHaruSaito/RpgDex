import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PlanLimits } from '../../models/planLimits';
import { ApiResponse } from '../../models/apiResponse';
import { UserSubscriptionInfo } from '../../models/userSubscriptionInfo';
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

  public GetAllUserPlanInfo(): Observable<ApiResponse<UserSubscriptionInfo[]>> {
    return this.http.get<ApiResponse<UserSubscriptionInfo[]>>(`${this.env}/allPlans`);
  }

  public GetFreePlanLimit(): Observable<ApiResponse<PlanLimits>> {
    return this.http.get<ApiResponse<PlanLimits>>(`${this.env}/freePlanLimit`);
  }
}
