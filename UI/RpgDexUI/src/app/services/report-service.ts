import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateReportRequest } from '../../models/createReportRequest';
import { ReportResponse } from '../../models/reportResponse';
import { ApiResponse } from '../../models/apiResponse';
import { GetAllReportResponse } from '../../models/getAllReportResponse';
import { ReportDetail } from '../../models/reportDetailBase';

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private baseUrl = `${environment.RpxDexApi}/Report`;
  private http = inject(HttpClient);

  public CreateReport(request: CreateReportRequest): Observable<ApiResponse<ReportResponse>> {
    return this.http.post<ApiResponse<ReportResponse>>(this.baseUrl, request);
  }

  public GetAll(
    page: number,
    pageSize: number,
    isActive: boolean,
  ): Observable<ApiResponse<GetAllReportResponse>> {
    const params: Record<string, string | boolean> = {
      page: page.toString(),
      pageSize: pageSize.toString(),
      isActive: isActive,
    };
    return this.http.get<ApiResponse<GetAllReportResponse>>(`${this.baseUrl}/All`, { params });
  }

  public GetById(id: string): Observable<ApiResponse<ReportDetail>> {
    return this.http.get<ApiResponse<ReportDetail>>(`${this.baseUrl}/${id}`);
  }

  public Close(request: { reportId: string }): Observable<ApiResponse<GetAllReportResponse>> {
    return this.http.patch<ApiResponse<GetAllReportResponse>>(`${this.baseUrl}/Close`, request);
  }

  public PunishUser(request: { reportId: string }): Observable<ApiResponse<GetAllReportResponse>> {
    return this.http.patch<ApiResponse<GetAllReportResponse>>(
      `${this.baseUrl}/PunishUser`,
      request,
    );
  }
}
