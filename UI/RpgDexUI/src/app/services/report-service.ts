import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateReportRequest } from '../../models/createReportRequest';
import { ReportResponse } from '../../models/reportResponse';
import { ApiResponse } from '../../models/apiResponse';
import { GetAllReportResponse } from '../../models/getAllReportResponse';

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  env = environment.RpxDexApi;
  http = inject(HttpClient);
  public CreateReport(request: CreateReportRequest): Observable<ApiResponse<ReportResponse>> {
    return this.http.post<ApiResponse<ReportResponse>>(this.env, request);
  }
  public GetAll(page: number, pageSize: number): Observable<ApiResponse<GetAllReportResponse>> {
    return this.http.get<ApiResponse<GetAllReportResponse>>(`${this.env}/All/${page}/${pageSize}`);
  }
  public GetById(id: string): Observable<ApiResponse<GetAllReportResponse>> {
    return this.http.get<ApiResponse<GetAllReportResponse>>(`${this.env}/${id}`);
  }
  public Close(request: { reportId: string }): Observable<ApiResponse<GetAllReportResponse>> {
    return this.http.patch<ApiResponse<GetAllReportResponse>>(`${this.env}/Close`, request);
  }
  public PunishUser(request: { reportId: string }): Observable<ApiResponse<GetAllReportResponse>> {
    return this.http.patch<ApiResponse<GetAllReportResponse>>(`${this.env}/PunishUser`, request);
  }
}
