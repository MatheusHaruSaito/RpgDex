import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild
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
export class CampaignChatComponent implements OnInit, OnDestroy {
  @Input() campaignId!: string;
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChild('chatInput') private chatInput!: ElementRef<HTMLInputElement>;

  messages: ChatMessage[] = [];
  newMessageText: string = '';
  currentUsername: string = '';

  isMinimized: boolean = false;
  unreadCount: number = 0;

  private chatSubscription!: Subscription;

  constructor(
    private chatService: CampaignChatService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    const cached = this.authService.currentUserValue;
    if (cached?.userName) {
      this.currentUsername = cached.userName;
    } else {
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
        this.scrollToBottom();
      },
    });

    const token = this.authService.Token;
    this.chatService.startConnection(this.campaignId, token);

    // O NgZone garante que o Angular processe os eventos do WebSocket/SignalR no ciclo de renderização atual
    this.chatSubscription = this.chatService.onMessageReceived().subscribe((msg) => {
      this.ngZone.run(() => {
        this.messages.push(msg);

        if (this.isMinimized) {
          this.unreadCount++;
        } else {
          this.scrollToBottom();
        }

        this.cdr.detectChanges();
      });
    });
  }

  toggleMinimize(): void {
    this.isMinimized = !this.isMinimized;
    if (!this.isMinimized) {
      this.unreadCount = 0;
      this.scrollToBottom();
      setTimeout(() => this.focusInput(), 0);
    }
  }

private scrollToBottom(): void {
  Promise.resolve().then(() => {
    try {
      if (this.scrollContainer?.nativeElement) {
        const el = this.scrollContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    } catch { }
  });
}

  private focusInput(): void {
    this.chatInput?.nativeElement?.focus();
  }

  send(): void {
    const text = this.newMessageText.trim().substring(0, 500);

    if (!text) return;

    this.newMessageText = '';

    const request: CampaignChatMessageRequest = {
      campaignId: this.campaignId,
      message: text,
    };

    this.chatService.sendMessage(request).subscribe({
      next: () => {
        this.focusInput();
      },
      error: (err) => {
        console.error('Erro ao enviar mensagem:', err);
        this.newMessageText = text;
        this.cdr.detectChanges();
        this.focusInput();
      },
    });
  }

  ngOnDestroy(): void {
    this.chatService.stopConnection(this.campaignId);
    this.chatSubscription?.unsubscribe();
  }
}