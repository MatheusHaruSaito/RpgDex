import { Injectable } from '@angular/core';
import { CreateCanvaElementRequest } from '../../models/createCanvaElementRequest';
import { CanvasElementResponse } from '../../models/canvasElementResponse';
import { ApiResponse } from '../../models/apiResponse';
import { Observable } from 'rxjs';
import { GetAllCanvasElementResponse } from '../../models/getAllCanvasElementResponse';
import { UpdateCanvaElementRequest } from '../../models/updateCanvaElementRequest';
import { MoveCanvaElementsRequest } from '../../models/moveCanvaElementsRequest';
import { ReOrderCanvaElementsRequest } from '../../models/reorderCanvaElementsRequest';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class CanvasElementService {
  private readonly controller = 'CanvaElement';
  private readonly env = `${environment.RpxDexApi}/${this.controller}`;

  constructor(private http: HttpClient) {}

  public CreateElement(
    request: CreateCanvaElementRequest,
  ): Observable<ApiResponse<CanvasElementResponse>> {
    return this.http.post<ApiResponse<CanvasElementResponse>>(this.env, request);
  }
  public GetAllElements(
    campaignId: string,
    page: string,
    pageSize: string,
  ): Observable<ApiResponse<GetAllCanvasElementResponse>> {
    const params: Record<string, string | number> = { campaignId, page, pageSize };
    return this.http.get<ApiResponse<GetAllCanvasElementResponse>>(this.env, { params });
  }
  public UpdateElement(request: UpdateCanvaElementRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(this.env, request);
  }
  public MoveElement(request: MoveCanvaElementsRequest): Observable<ApiResponse<boolean>> {
    return this.http.patch<ApiResponse<boolean>>(`${this.env}/MoveElement`, request);
  }
  public ReOrderElement(request: ReOrderCanvaElementsRequest): Observable<ApiResponse<boolean>> {
    return this.http.patch<ApiResponse<boolean>>(`${this.env}/ReOrderElement`, request);
  }
  public DeactiveElement(request: SetElementActiveStateRequest): Observable<ApiResponse<boolean>> {
    return this.http.patch<ApiResponse<boolean>>(`${this.env}/Deactive`, request);
  }
}
