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
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatMessage } from '../../../models/chatMessage';
import { CampaignChatMessageRequest } from '../../../models/campaignChatMessageRequest';
import { Character } from '../../../models/character';
import { AuthService } from '../../services/auth-service';
import { CampaignChatService } from '../../services/campaign-chat-service';
import { CharacterService } from '../../services/character-service';

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
  currentUserId: string = '';

  // Filtro de Pesquisa
  searchQuery: string = '';
  showSearchInput: boolean = false;

  // Personas / Personagens do Utilizador
  myCharacters: Character[] = [];
  selectedCharacterId: string | null = null;

  // Modos de Edição
  editingMessageId: string | null = null;
  editingText: string = '';

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
    private characterService: CharacterService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    const cached = this.authService.currentUserValue;
    if (cached) {
      this.currentUsername = cached.userName ?? '';
      this.currentUserId = cached.id ?? '';
    } else {
      this.authService.GetLoggedUser().subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.currentUsername = res.data.userName;
            this.currentUserId = res.data.id;
            this.cdr.detectChanges();
          }
        },
      });
    }

    this.loadUserCharacters();

    const token = this.authService.Token;
    this.chatService.startConnection(this.campaignId, token);
    this.initialLoad();

    // Escuta de mensagens via SignalR com Mapeamento Completo (PascalCase & camelCase)
    this.chatSubscription = this.chatService.onMessageReceived().subscribe((msg: any) => {
      this.ngZone.run(() => {
        const normalizedMsg = this.normalizeMessage(msg);

        const index = normalizedMsg.id
          ? this.messages.findIndex((m) => m.id === normalizedMsg.id)
          : -1;

        if (index !== -1) {
          // Atualiza a mensagem se já existir (Edição/Restauração)
          this.messages[index] = normalizedMsg;
          this.messages = [...this.messages];
        } else {
          // Adiciona nova mensagem recebida
          this.messages = [...this.messages, normalizedMsg];

          if (this.isMinimized) {
            this.unreadCount++;
          } else {
            this.scrollToBottom();
          }
        }
        this.cdr.detectChanges();
      });
    });
  }

  // Mapeamento para garantir compatibilidade com .NET DTOs
  private normalizeMessage(msg: any): ChatMessage {
    return {
      id: msg.id ?? msg.Id ?? '',
      userId: msg.userId ?? msg.UserId ?? '',
      username: msg.username ?? msg.Username ?? msg.userName ?? 'Anónimo',
      userIcon: msg.userIcon ?? msg.UserIcon ?? msg.iconPath ?? '',
      data: msg.data ?? msg.Data ?? msg.message ?? msg.Message ?? '',
      sentAt: msg.sentAt ?? msg.SentAt ?? new Date(),
      editedAt: msg.editedAt ?? msg.EditedAt,
    };
  }

  // Determina se a mensagem foi enviada pelo utilizador atual
  isMyMessage(msg: ChatMessage): boolean {
    if (!msg) return false;

    if (msg.userId && this.currentUserId) {
      if (msg.userId.toLowerCase() === this.currentUserId.toLowerCase()) {
        return true;
      }
    }

    if (msg.username && this.currentUsername) {
      if (msg.username.toLowerCase() === this.currentUsername.toLowerCase()) {
        return true;
      }
    }

    if (msg.username && this.myCharacters.length > 0) {
      return this.myCharacters.some((c) => c.name.toLowerCase() === msg.username.toLowerCase());
    }

    return false;
  }

  private loadUserCharacters(): void {
    this.characterService.GetAll().subscribe({
      next: (res) => {
        this.myCharacters = res.data?.characters ?? [];
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  initialLoad(): void {
    this.isInitialLoading = true;
    const filter = this.searchQuery.trim() ? this.searchQuery.trim() : undefined;

    this.chatService.getMessages(this.campaignId, undefined, 20, filter).subscribe({
      next: (r) => {
        const rawItems = r.data?.items ?? [];
        this.messages = rawItems.map((item) => this.normalizeMessage(item));
        this.nextCursor = r.data?.nextCursor;
        this.hasMore = r.data?.hasMore ?? false;
        this.isInitialLoading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: (err) => {
        console.error('Erro ao carregar mensagens:', err);
        this.isInitialLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onSearchChange(): void {
    this.initialLoad();
  }

  toggleSearch(): void {
    this.showSearchInput = !this.showSearchInput;
    if (!this.showSearchInput) {
      this.searchQuery = '';
      this.initialLoad();
    }
  }

  loadMoreMessages(): void {
    if (this.isLoadingMore || !this.hasMore) return;

    this.isLoadingMore = true;
    const container = this.scrollContainer.nativeElement;
    const previousScrollHeight = container.scrollHeight;

    const filter = this.searchQuery.trim() ? this.searchQuery.trim() : undefined;

    this.chatService.getMessages(this.campaignId, this.nextCursor, 20, filter).subscribe({
      next: (res) => {
        if (!res.success || !res.data) {
          this.isLoadingMore = false;
          return;
        }

        const rawOlder = res.data.items || [];
        const olderMessages = rawOlder.map((item) => this.normalizeMessage(item));

        if (olderMessages.length === 0) {
          this.hasMore = false;
          this.isLoadingMore = false;
          return;
        }

        const existingIds = new Set(this.messages.map((m) => m.id));
        const newUniqueMessages = olderMessages.filter((m) => !existingIds.has(m.id));

        this.messages = [...newUniqueMessages, ...this.messages];

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

  send(): void {
    this.sendError = '';
    const text = this.newMessageText.trim();
    const commandPrefix = this.chatService.commandPrefix;

    if (!text || this.isSending) return;

    if (text.length > 500) {
      this.sendError = 'A mensagem deve ter no máximo 500 caracteres.';
      return;
    }

    this.isSending = true;
    const textToSend = text;
    this.newMessageText = '';

    // Garante que characterId é um GUID válido ou estritamente null
    const charId =
      this.selectedCharacterId && this.selectedCharacterId !== 'null'
        ? this.selectedCharacterId
        : null;

    const request: CampaignChatMessageRequest = {
      campaignId: this.campaignId,
      characterId: charId,
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
    if (text.startsWith(commandPrefix)) {
      console.log('COMMANDO: ', text);
      this.chatService.tryExecuteCommand(text, this.campaignId)?.subscribe();
    }
  }

  // ── EDIÇÃO E RESTAURAÇÃO DE MENSAGENS ──
  startEditing(msg: ChatMessage): void {
    this.editingMessageId = msg.id;
    this.editingText = msg.data;
  }

  cancelEdit(): void {
    this.editingMessageId = null;
    this.editingText = '';
  }

  saveEdit(messageId: string): void {
    const text = this.editingText.trim();
    if (!text) return;

    this.chatService
      .editMessage({
        messageId: messageId,
        campaignId: this.campaignId,
        newMessage: text,
      })
      .subscribe({
        next: () => {
          this.editingMessageId = null;
          this.editingText = '';
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Erro ao editar mensagem:', err),
      });
  }

  restorePreviousVersion(msg: ChatMessage): void {
    if (!confirm('Deseja restaurar a versão anterior desta mensagem?')) return;

    this.chatService
      .restoreMessage({
        messageId: msg.id,
        campaignId: this.campaignId,
        historyIndex: 0,
      })
      .subscribe({
        next: () => this.cdr.detectChanges(),
        error: (err) => console.error('Erro ao restaurar versão anterior:', err),
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

  ngOnDestroy(): void {
    this.chatService.stopConnection(this.campaignId);
    this.chatSubscription?.unsubscribe();
  }
}
