import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../../models/apiResponse';
import { CreateCanvaElementRequest } from '../../models/createCanvaElementRequest';
import { CanvasElementResponse } from '../../models/canvasElementResponse';
import { GetAllCanvasElementResponse } from '../../models/getAllCanvasElementResponse';
import { UpdateCanvaElementRequest } from '../../models/updateCanvaElementRequest';
import { MoveCanvaElementsRequest } from '../../models/moveCanvaElementsRequest';
import { ReOrderCanvaElementsRequest } from '../../models/reorderCanvaElementsRequest';
import { SetElementActiveStateRequest } from '../../models/setElementActiveStateRequest';
import { CreateCanvaTokenElementRequest as CreateCanvasTokenElementRequest } from '../../models/createCanvaTokenElementRequest';
import { QuickCreateCanvaTokenElementRequest } from '../../models/quickCreateCanvaTokenElementRequest';
import { ScaleElementRequest } from '../../models/scaleElementRequest';

@Injectable({ providedIn: 'root' })
export class CanvasElementService {
  private readonly env = `${environment.RpxDexApi}/CanvasElement`;
  private currentCampaignId?: string;
  private hubConnection?: signalR.HubConnection;

  private readonly elementsMoved$ = new Subject<{ id: string; x: number; y: number }[]>();
  private readonly elementsScaled$ = new Subject<{ id: string; scale: number }[]>();
  private readonly elementAdded$ = new Subject<CanvasElementResponse>();
  private readonly reordered$ = new Subject<{ id: string; z: number }[]>();
  private readonly activeChanged$ = new Subject<{ ids: string[]; state: boolean }>();
  constructor(private http: HttpClient) {}

  public async startConnection(campaignId: string, getToken: () => string): Promise<void> {
    if (this.hubConnection) {
      await this.stopConnection();
    }

    this.currentCampaignId = campaignId;
    const hubUrl = `${environment.RpxDexApi.replace('/api', '')}/hubs/campaign-canvas`;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, { accessTokenFactory: () => getToken() })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.on('ElementsMoved', (elements: { id: string; x: number; y: number }[]) => {
      this.elementsMoved$.next(elements);
    });

    this.hubConnection.on('ElementsScaled', (elements: { id: string; scale: number }[]) =>
      this.elementsScaled$.next(elements),
    );
    this.hubConnection.on('ElementAdded', (elements: CanvasElementResponse) =>
      this.elementAdded$.next(elements),
    );
    this.hubConnection.on('ElementsReOrdered', (elements: { id: string; z: number }[]) =>
      this.reordered$.next(elements),
    );
    this.hubConnection.on('ElementsActiveChanged', (elements: { ids: string[]; state: boolean }) => {
      this.activeChanged$.next(elements);
    });
    this.hubConnection.onreconnected(() => {
      this.hubConnection!.invoke('JoinCampaignCanvas', this.currentCampaignId).catch((err) =>
        console.error('Rejoin canvas error', err),
      );
    });

    try {
      await this.hubConnection.start();
      await this.hubConnection.invoke('JoinCampaignCanvas', campaignId);
    } catch (err) {
      console.error('SignalR canvas error', err);
    }
  }

  public async stopConnection(): Promise<void> {
    if (!this.hubConnection) return;
    try {
      if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
        await this.hubConnection.invoke('LeaveCampaignCanvas', this.currentCampaignId);
      }
      await this.hubConnection.stop();
    } finally {
      this.hubConnection = undefined;
      this.currentCampaignId = undefined;
    }
  }
  public onElementsMoved(): Observable<{ id: string; x: number; y: number }[]> {
    return this.elementsMoved$.asObservable();
  }

  public onElementsScaled(): Observable<{ id: string; scale: number }[]> {
    return this.elementsScaled$.asObservable();
  }
  public onCreateElement(): Observable<CanvasElementResponse> {
    return this.elementAdded$.asObservable();
  }
  public onElementsActiveChanged(): Observable<{ ids: string[]; state: boolean }> {
    return this.activeChanged$.asObservable();
  }
  public onElementsReOrdered(): Observable<{ id: string; z: number }[]> {
    return this.reordered$.asObservable();
  }
  public CreateElement(
    request: CreateCanvaElementRequest | FormData,
  ): Observable<ApiResponse<CanvasElementResponse>> {
    return this.http.post<ApiResponse<CanvasElementResponse>>(`${this.env}/element`, request, {
      headers: this.connectionHeaders(),
    });
  }
  public CreateImageElement(
    request: CreateCanvaElementRequest | FormData,
  ): Observable<ApiResponse<CanvasElementResponse>> {
    return this.http.post<ApiResponse<CanvasElementResponse>>(
      `${this.env}/element/image`,
      request,
      {
        headers: this.connectionHeaders(),
      },
    );
  }
  public CreateTokenElement(
    request: CreateCanvasTokenElementRequest | FormData,
  ): Observable<ApiResponse<CanvasElementResponse>> {
    console.log(request);
    return this.http.post<ApiResponse<CanvasElementResponse>>(
      `${this.env}/element/token`,
      request,
      {
        headers: this.connectionHeaders(),
      },
    );
  }
  public QuickCreateTokenElement(
    request: QuickCreateCanvaTokenElementRequest | FormData,
  ): Observable<ApiResponse<CanvasElementResponse>> {
    console.log(request);
    return this.http.post<ApiResponse<CanvasElementResponse>>(
      `${this.env}/element/token/quick`,
      request,
      {
        headers: this.connectionHeaders(),
      },
    );
  }
  public GetAllElements(
    campaignId: string,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
  ): Observable<ApiResponse<GetAllCanvasElementResponse>> {
    return this.http.get<ApiResponse<GetAllCanvasElementResponse>>(`${this.env}/All`, {
      params: { campaignId, maxX, minY, minX, maxY },
    });
  }

  public UpdateElement(request: UpdateCanvaElementRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.env}/element`, request);
  }

  public UpdateImageElement(
    request: UpdateCanvaElementRequest | FormData,
  ): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.env}/element/image`, request);
  }

  public MoveElement(request: MoveCanvaElementsRequest): Observable<ApiResponse<boolean>> {
    return this.http.patch<ApiResponse<boolean>>(`${this.env}/MoveElement`, request, {
      headers: this.connectionHeaders(),
    });
  }

  public ReOrderElement(request: ReOrderCanvaElementsRequest): Observable<ApiResponse<boolean>> {
    return this.http.patch<ApiResponse<boolean>>(`${this.env}/ReOrderElement`, request, {
      headers: this.connectionHeaders(),
    });
  }

  public DeactiveElement(request: SetElementActiveStateRequest): Observable<ApiResponse<boolean>> {
    return this.http.patch<ApiResponse<boolean>>(`${this.env}/Deactive`, request, {
      headers: this.connectionHeaders(),
    });
  }
  public ActiveElement(request: SetElementActiveStateRequest): Observable<ApiResponse<boolean>> {
    return this.http.patch<ApiResponse<boolean>>(`${this.env}/Active`, request, {
      headers: this.connectionHeaders(),
    });
  }
  public ScaleElement(request: ScaleElementRequest): Observable<ApiResponse<boolean>> {
    return this.http.patch<ApiResponse<boolean>>(`${this.env}/ScaleElement`, request, {
      headers: this.connectionHeaders(),
    });
  }
  private connectionHeaders(): HttpHeaders {
    const id = this.hubConnection?.connectionId;
    return id ? new HttpHeaders({ 'X-Connection-Id': id }) : new HttpHeaders();
  }
}
