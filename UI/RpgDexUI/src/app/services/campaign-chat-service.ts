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
import { chatCommandList } from '../../models/chatCommandList';
import { AddRollToLogRequest } from '../../models/addRollToLogRequest';
import { DiceRollsLogResult } from '../../models/diceRollsLogResult';
import { CommandModel } from '../../models/commandModel';
import e from 'express';
@Injectable({
  providedIn: 'root',
})
export class CampaignChatService {
  private hubConnection!: signalR.HubConnection;
  private messageReceived$ = new Subject<ChatMessage>();
  private readonly controller = 'Campaign';
  private readonly env = `${environment.RpxDexApi}/${this.controller}`;
  private COMMAND_SUFFIX = '@rpg';
  private normalize = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

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
  public AddRollToLog(request: AddRollToLogRequest): Observable<DiceRollsLogResult[]> {
    return this.http.patch<DiceRollsLogResult[]>(`${this.env}/AddRollToLog`, request);
  }
  public get commandSuffix() {
    return this.COMMAND_SUFFIX;
  }
  public tryExecuteCommand(imput: string, campId: string) {
    const [rawName, ...args] = imput.slice(this.COMMAND_SUFFIX.length).trim().split(/\s+/);
    const command = this.findCommand(rawName);
    if (!command) return;
    return this.ExecuteCommand(campId, command, args);
  }
  private findCommand(name: string) {
    const key = this.normalize(name);
    return chatCommandList.find((c) => c.aliases.some((alias) => this.normalize(alias) === key));
  }

  private ExecuteCommand(campId: string, command: CommandModel, args: string[]) {
    switch (command.name) {
      case 'roll': {
        const parts = this.formatCommandArg(command.name, args);
        if (parts.length !== 2) return;

        const result = command.run(parts) as number[];
        console.log(result);
        if (result.some(Number.isNaN)) return;
        const request: AddRollToLogRequest = {
          campaignId: campId,
          expression: args[0],
          results: result,
        };
        console.log('request: ', request);
        this.AddRollToLog(request).subscribe({
          next: (r) => {
            return r;
          },
          error: (e) => {
            console.error(e);
          },
        });
        break;
      }
      default:
        command.run(args);
        break;
    }
  }
  private formatCommandArg(name: string, args: string[]): string[] {
    switch (name) {
      case 'roll': {
        const match = args[0]?.match(/^(\d*)d(\d+)$/i);
        if (!match) return [];
        return [match[1] || '1', match[2]];
      }
      default: {
        return args;
      }
    }
  }
}
