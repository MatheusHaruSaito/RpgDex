import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { ChatMessage } from '../../models/chatMessage';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { CampaignChatMessageRequest } from '../../models/campaignChatMessageRequest';
import { ApiResponse } from '../../models/apiResponse';
import { ChatPagedResultDto } from '../../models/chatPagedResultDto';
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
  ): Observable<ApiResponse<ChatPagedResultDto>> {
    return this.http.get<ApiResponse<ChatPagedResultDto>>(`${this.env}/GetMessages/${campaignId}`, {
      params: {
        ...(beforeSentAt && { beforeSentAt }),
        pageSize: pageSize,
      },
    });
  }
  public stopConnection(campaignId: string): void {
    if (this.hubConnection) {
      this.hubConnection.invoke('LeaveCampaign', campaignId);
      this.hubConnection.stop();
    }
  }
}
