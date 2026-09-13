import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ChatMessage } from '../../../models/chatMessage';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth-service';
import { CampaignChatService } from '../../services/campaign-chat-service';
import { CampaignChatMessageRequest } from '../../../models/campaignChatMessageRequest';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-campaign-chat-component',
  imports: [CommonModule, FormsModule],
  templateUrl: './campaign-chat-component.html',
  styleUrl: './campaign-chat-component.css',
})
export class CampaignChatComponent implements OnInit, OnDestroy {
  @Input() campaignId!: string;

  messages: ChatMessage[] = [];
  newMessageText: string = '';
  private chatSubscription!: Subscription;

  constructor(
    private chatService: CampaignChatService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}
  ngOnInit(): void {
    const token = this.authService.Token;
    this.chatService.startConnection(this.campaignId, token);
    this.chatSubscription = this.chatService.getMessages().subscribe((msg) => {
      this.messages.push(msg);
      this.cdr.detectChanges();
    });
  }

  send(): void {
    if (!this.newMessageText.trim()) return;
    const request: CampaignChatMessageRequest = {
      campaignId: this.campaignId,
      message: this.newMessageText,
    };

    this.chatService.sendMessage(request).subscribe({
      next: (r) => {
        this.newMessageText = '';
      },
      error: (err) => console.log('error sending message: ', err),
    });
  }

  ngOnDestroy(): void {
    (this.chatService.stopConnection(this.campaignId), this.chatSubscription.unsubscribe());
  }
}
