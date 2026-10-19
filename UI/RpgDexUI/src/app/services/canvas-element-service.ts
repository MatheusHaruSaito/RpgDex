import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../../models/apiResponse';
import { CreateCanvaElementRequest } from '../../models/createCanvaElementRequest';
import { CanvasElementResponse } from '../../models/canvasElementResponse';
import { GetAllCanvasElementResponse } from '../../models/getAllCanvasElementResponse';
import { UpdateCanvaElementRequest } from '../../models/updateCanvaElementRequest';
import { MoveCanvaElementsRequest } from '../../models/moveCanvaElementsRequest';
import { ReOrderCanvaElementsRequest } from '../../models/reorderCanvaElementsRequest';


export interface SetElementActiveStateRequest {
  campaignId: string;
  items: string[];
}

@Injectable({ providedIn: 'root' })
export class CanvasElementService {
  private readonly env = `${environment.RpxDexApi}/CanvaElement`;

  constructor(private http: HttpClient) {}

  public CreateElement(request: CreateCanvaElementRequest): Observable<ApiResponse<CanvasElementResponse>> {
    return this.http.post<ApiResponse<CanvasElementResponse>>(this.env, request);
  }

  public GetAllElements(campaignId: string, page: string, pageSize: string): Observable<ApiResponse<GetAllCanvasElementResponse>> {
    return this.http.get<ApiResponse<GetAllCanvasElementResponse>>(`${this.env}/All`, { params: { campaignId, page, pageSize } });
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