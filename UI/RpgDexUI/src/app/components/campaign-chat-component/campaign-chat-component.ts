import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  AfterViewChecked
} from '@angular/core';
import { ChatMessage } from '../../../models/chatMessage';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth-service';
import { CampaignChatService } from '../../services/campaign-chat-service';
import { CampaignChatMessageRequest } from '../../../models/campaignChatMessageRequest';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-campaign-chat-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './campaign-chat-component.html',
  styleUrl: './campaign-chat-component.css',
})
export class CampaignChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() campaignId!: string;
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  messages: ChatMessage[] = [];
  newMessageText: string = '';
  currentUsername: string = '';

  isMinimized: boolean = false;
  unreadCount: number = 0;

  private chatSubscription!: Subscription;
  private shouldScroll = false;

  constructor(
    private chatService: CampaignChatService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Tenta o cache primeiro (BehaviorSubject já populado por login anterior)
    const cached = this.authService.currentUserValue;
    if (cached?.userName) {
      this.currentUsername = cached.userName;
    } else {
      // Fallback: busca o perfil e usa userName (não displayName)
      this.authService.GetLoggedUser().subscribe({
        next: (res) => {
          if (res.success && res.data?.userName) {
            this.currentUsername = res.data.userName;
            this.cdr.detectChanges();
          }
        }
      });
    }

    this.chatService.getMessages(this.campaignId).subscribe({
      next: (r) => {
        this.messages = r.data ?? [];
        this.shouldScroll = true;
      },
    });

    const token = this.authService.Token;
    this.chatService.startConnection(this.campaignId, token);

    this.chatSubscription = this.chatService.onMessageReceived().subscribe((msg) => {
      this.messages.push(msg);
      if (this.isMinimized) {
        this.unreadCount++;
      } else {
        this.shouldScroll = true;
      }
      this.cdr.detectChanges();
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && !this.isMinimized) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  toggleMinimize(): void {
    this.isMinimized = !this.isMinimized;
    if (!this.isMinimized) {
      this.unreadCount = 0;
      this.shouldScroll = true;
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer?.nativeElement) {
        this.scrollContainer.nativeElement.scrollTop =
          this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch {}
  }

  send(): void {
    if (!this.newMessageText.trim()) return;
    const request: CampaignChatMessageRequest = {
      campaignId: this.campaignId,
      message: this.newMessageText.trim(),
    };
    this.chatService.sendMessage(request).subscribe({
      next: () => {
        this.newMessageText = '';
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erro ao enviar mensagem:', err),
    });
  }

  ngOnDestroy(): void {
    this.chatService.stopConnection(this.campaignId);
    this.chatSubscription?.unsubscribe();
  }
}