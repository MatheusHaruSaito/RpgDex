import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PlanResponse } from '../../models/planResponse';
import { CreatePlanRequest } from '../../models/createPlanRequest';
import { ApiResponse } from '../../models/apiResponse';

@Injectable({
  providedIn: 'root',
})
export class PlanService {
  private readonly controller = 'Plan';
  private readonly env = `${environment.RpxDexApi}/${this.controller}`;

  private http = inject(HttpClient);
  //implement when admin panel is ready
  // public AddPlan(request: CreatePlanRequest): Observable<ApiResponse<PlanResponse>> {
  //   return this.http.post<ApiResponse<PlanResponse>>(`${this.env}`, request);
  // }
  public GetAllPlan(): Observable<ApiResponse<PlanResponse[]>> {
    return this.http.get<ApiResponse<PlanResponse[]>>(`${this.env}`);
  }
  public GetById(id: string): Observable<ApiResponse<PlanResponse>> {
    return this.http.get<ApiResponse<PlanResponse>>(`${this.env}/${id}`);
  }
}
