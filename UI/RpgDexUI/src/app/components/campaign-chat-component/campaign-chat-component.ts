import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
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
  nextCursor?: string;
  hasMore: boolean = true;
  newMessageText: string = '';
  currentUsername: string = '';

  isInitialLoading: boolean = true;
  isLoadingMore: boolean = false;
  isSending: boolean = false;
  sendError: string = '';

  isMinimized: boolean = false;
  unreadCount: number = 0;

  private chatSubscription!: Subscription;

  constructor(
    private chatService: CampaignChatService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

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
        },
      });
    }

    const token = this.authService.Token;
    this.chatService.startConnection(this.campaignId, token);
    this.initialLoad();

    // Executa os retornos do SignalR/WebSocket dentro do ciclo do Angular
    this.chatSubscription = this.chatService.onMessageReceived().subscribe((msg) => {
      this.ngZone.run(() => {
        // Evita duplicar mensagens recebidas em tempo real caso já existam
        if (!this.messages.some((m) => m.id === msg.id)) {
          this.messages.push(msg);
        }

        if (this.isMinimized) {
          this.unreadCount++;
        } else {
          this.scrollToBottom();
        }

        this.cdr.detectChanges();
      });
    });
  }

  initialLoad(): void {
    this.isInitialLoading = true;
    this.chatService.getMessages(this.campaignId, undefined, 20).subscribe({
      next: (r) => {
        this.messages = r.data?.items ?? [];
        this.nextCursor = r.data?.nextCursor;
        this.hasMore = r.data?.hasMore ?? false;
        this.isInitialLoading = false;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.scrollToBottom();
        }, 50);
      },
      error: () => {
        this.isInitialLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadMoreMessages(): void {
    if (this.isLoadingMore || !this.hasMore) return;

    this.isLoadingMore = true;
    const container = this.scrollContainer.nativeElement;
    const previousScrollHeight = container.scrollHeight;

    this.chatService.getMessages(this.campaignId, this.nextCursor, 20).subscribe({
      next: (res) => {
        if (!res.success || !res.data) {
          this.isLoadingMore = false;
          return;
        }

        const olderMessages = res.data.items || [];

        if (olderMessages.length === 0) {
          this.hasMore = false;
          this.isLoadingMore = false;
          return;
        }

        // 1. DEDUPLICAÇÃO
        const existingIds = new Set(this.messages.map((m) => m.id));
        const newUniqueMessages = olderMessages.filter((m) => !existingIds.has(m.id));

        // 2. CONCATENAÇÃO NO TOPO
        this.messages = [...newUniqueMessages, ...this.messages];

        // 3. ATUALIZAÇÃO DO CURSOR
        if (olderMessages.length > 0) {
          const oldestMsg = olderMessages[0];
          const rawSentAt = oldestMsg.sentAt;
          const cursorDate = rawSentAt instanceof Date ? rawSentAt.toISOString() : rawSentAt;

          this.nextCursor = cursorDate ?? res.data.nextCursor;
        } else {
          this.nextCursor = res.data.nextCursor;
        }

        this.hasMore = res.data.hasMore;
        this.isLoadingMore = false;

        // 4. PRESERVAÇÃO DA POSIÇÃO DO SCROLL
        setTimeout(() => {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - previousScrollHeight;
          this.cdr.detectChanges();
        }, 0);
      },
      error: (err) => {
        console.error('Erro ao buscar mais mensagens:', err);
        this.isLoadingMore = false;
        this.cdr.detectChanges();
      },
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
      } catch {}
    });
  }

  private focusInput(): void {
    this.chatInput?.nativeElement?.focus();
  }

  send(): void {
    this.sendError = '';
    const text = this.newMessageText.trim();

    if (!text || this.isSending) return;

    if (text.length > 500) {
      this.sendError = 'A mensagem deve ter no máximo 500 caracteres.';
      return;
    }

    this.isSending = true;
    const textToSend = text;
    this.newMessageText = '';

    const request: CampaignChatMessageRequest = {
      campaignId: this.campaignId,
      message: textToSend,
    };

    this.chatService.sendMessage(request).subscribe({
      next: () => {
        this.isSending = false;
        this.focusInput();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao enviar mensagem:', err);
        this.isSending = false;
        this.newMessageText = textToSend;
        this.sendError = err?.error?.message ?? 'Erro ao enviar a mensagem.';
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