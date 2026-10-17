import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { ChatMessage } from '../../models/chatMessage';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { CampaignChatMessageRequest } from '../../models/campaignChatMessageRequest';
import { ApiResponse } from '../../models/apiResponse';
import { ChatPagedResultDto } from '../../models/chatPagedResultDto';
import { EditChatMessageRequest } from '../../models/editChatMessageRequest';
import { RestoreMessageRequest } from '../../models/restoreMessageRequest';
@Injectable({
  providedIn: 'root',
})
export class CampaignChatService {
  private hubConnection!: signalR.HubConnection;
  private messageReceived$ = new Subject<ChatMessage>();
  private readonly controller = 'Campaign';
  private readonly env = `${environment.RpxDexApi}/${this.controller}`;
  constructor(private http: HttpClient) {}

  public startConnection(campaignId: string, token: string): void {
    const hubUrl = `${environment.RpxDexApi.replace('/api', '')}/hubs/campaign-chat`;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection
      .start()
      .then(() => {
        this.hubConnection.invoke('JoinCampaign', campaignId);
      })
      .catch((err) => console.error('SingalR error', err));

    this.hubConnection.on('ReceiveMessage', (chatMessage: ChatMessage) => {
      console.log('Mensagem :', chatMessage);
      this.messageReceived$.next(chatMessage);
    });
  }
  public sendMessage(request: CampaignChatMessageRequest): Observable<any> {
    return this.http.post(`${this.env}/SendMessage`, request);
  }
  public onMessageReceived(): Observable<ChatMessage> {
    return this.messageReceived$.asObservable();
  }
  public getMessages(
    campaignId: string,
    beforeSentAt?: string,
    pageSize: number = 20,
    data?: string,
  ): Observable<ApiResponse<ChatPagedResultDto>> {
    const params: Record<string, string | number> = { pageSize };
    if (beforeSentAt) params['beforeSentAt'] = beforeSentAt;
    if (data) params['data'] = data;
    return this.http.get<ApiResponse<ChatPagedResultDto>>(`${this.env}/GetMessages/${campaignId}`, {
      params,
    });
  }
  public stopConnection(campaignId: string): void {
    if (this.hubConnection) {
      this.hubConnection.invoke('LeaveCampaign', campaignId);
      this.hubConnection.stop();
    }
  }
  public editMessage(request: EditChatMessageRequest): Observable<any> {
    return this.http.patch(`${this.env}/EditMessage`, request);
  }
  public restoreMessage(request: RestoreMessageRequest): Observable<any> {
    return this.http.patch(`${this.env}/RestoreMessage`, request);
  }
}
