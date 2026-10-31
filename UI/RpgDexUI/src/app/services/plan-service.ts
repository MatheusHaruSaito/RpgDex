import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PlanResponse } from '../../models/planResponse';
import { CreatePlanRequest } from '../../models/createPlanRequest';

@Injectable({
  providedIn: 'root',
})
export class PlanService {
  private readonly controller = 'Plan';
  private readonly env = `${environment.RpxDexApi}/${this.controller}`;

  private http = inject(HttpClient);

  public AddPlan(request: CreatePlanRequest): Observable<PlanResponse> {
    return this.http.post<PlanResponse>(`${this.env}`, request);
  }
  public GetAllPlan(): Observable<PlanResponse[]> {
    return this.http.get<PlanResponse[]>(`${this.env}`);
  }
  public GetById(id: string): Observable<PlanResponse> {
    return this.http.get<PlanResponse>(`${this.env}/${id}`);
  }
}
