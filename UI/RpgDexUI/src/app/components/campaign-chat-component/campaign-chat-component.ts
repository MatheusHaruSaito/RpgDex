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
  isLoadingMore: boolean = false;
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

    this.initialLoad();

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
  initialLoad(): void {
    this.chatService.getMessages(this.campaignId, undefined, 20).subscribe({
      next: (r) => {
        this.messages = r.data?.items ?? [];
        this.nextCursor = r.data?.nextCursor;
        this.hasMore = r.data?.hasMore ?? false;
        setTimeout(() => {
          this.scrollToBottom();
        }, 50);
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
          console.error('Erro ao carregar mensagens:', res.message);
          this.isLoadingMore = false;
          return;
        }

        // Se o backend enviar os itens em ordem cronológica inversa para paginação, ajustamos aqui
        const olderMessages = res.data.items;

        this.messages = [...olderMessages, ...this.messages];
        this.nextCursor = res.data.nextCursor;
        this.hasMore = res.data.hasMore;
        this.isLoadingMore = false;

        // Mantém a posição visual do scroll após inserir os itens no topo
        setTimeout(() => {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - previousScrollHeight;
          this.cdr.detectChanges();
        }, 0);
      },
      error: (err) => {
        console.error('Erro ao buscar mais mensagens:', err);
        this.isLoadingMore = false;
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
