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
  @ViewChild('rollsScrollContainer') private rollsScrollContainer!: ElementRef;
  @ViewChild('chatInput') private chatInput!: ElementRef<HTMLInputElement>;

  activeTab: 'chat' | 'rolls' = 'chat';

  messages: ChatMessage[] = [];
  rollsHistory: any[] = [];

  nextCursor?: string;
  hasMore: boolean = true;
  newMessageText: string = '';
  currentUsername: string = '';
  currentUserId: string = '';

  searchQuery: string = '';
  showSearchInput: boolean = false;

  myCharacters: Character[] = [];
  selectedCharacterId: string | null = null;

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

    // Escuta de mensagens via SignalR
    this.chatSubscription = this.chatService.onMessageReceived().subscribe((msg: any) => {
      this.ngZone.run(() => {
        const normalizedMsg = this.normalizeMessage(msg);

        // Se for rolagem ou comando, insere na aba de dados
        if (this.isRollOrCommand(normalizedMsg.data)) {
          this.rollsHistory = [...this.rollsHistory, normalizedMsg];
        } else {
          const index = normalizedMsg.id
            ? this.messages.findIndex((m) => m.id === normalizedMsg.id)
            : -1;

          if (index !== -1) {
            this.messages[index] = normalizedMsg;
            this.messages = [...this.messages];
          } else {
            this.messages = [...this.messages, normalizedMsg];
          }
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

  get chatMessagesOnly(): ChatMessage[] {
    return this.messages.filter((m) => !this.isRollOrCommand(m.data));
  }

  // Identifica se uma mensagem pertence à aba de Dados & Comandos
  isRollOrCommand(text: string): boolean {
    if (!text) return false;
    const trimmed = text.trim();
    const lower = text.toLowerCase();

    return (
      trimmed.startsWith(this.chatService.commandPrefix) ||
      trimmed.includes('#') ||
      trimmed.includes('🎲') ||
      /\b\d*d\d+\b/i.test(trimmed) || // Detecta padrões de dados (2d20, 1d6, d20, etc.)
      lower.includes('rolou') ||
      lower.includes('resultado') ||
      lower.includes('rolagem')
    );
  }

  // Extrai a expressão da rolagem de forma segura para o card
  getRollExpression(roll: any): string {
    if (!roll) return '';
    if (typeof roll === 'string') return roll;
    if (roll.expression) return roll.expression;
    if (roll.data && typeof roll.data === 'string') return roll.data;
    return roll.message || 'Rolagem de Dados';
  }

  // Extrai o resultado final da rolagem de forma segura para o card
  getRollTotal(roll: any): string | number {
    if (!roll) return '?';
    if (roll.total !== undefined && roll.total !== null) return roll.total;
    if (roll.result !== undefined && roll.result !== null) return roll.result;
    if (roll.value !== undefined && roll.value !== null) return roll.value;

    if (typeof roll.data === 'string') {
      const match = roll.data.match(/(?:=|\:)\s*(\d+)/);
      if (match) return match[1];
    }
    return '?';
  }

  setTab(tab: 'chat' | 'rolls'): void {
    this.activeTab = tab;
    this.cdr.detectChanges();
    setTimeout(() => this.scrollToBottom(), 50);
  }

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

  isMyMessage(msg: ChatMessage): boolean {
    if (!msg) return false;

    if (msg.userId && this.currentUserId) {
      if (msg.userId.toLowerCase() === this.currentUserId.toLowerCase()) return true;
    }

    if (msg.username && this.currentUsername) {
      if (msg.username.toLowerCase() === this.currentUsername.toLowerCase()) return true;
    }

    if (msg.username && this.myCharacters.length > 0) {
      return this.myCharacters.some((c) => c.name.toLowerCase() === msg.username.toLowerCase());
    }

    return false;
  }

  private loadUserCharacters(): void {
    this.characterService.GetAllFromCampaign(this.campaignId).subscribe({
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

    this.chatService.getMessages(this.campaignId, undefined, 30, filter).subscribe({
      next: (r) => {
        const rawItems = r.data?.items ?? [];
        const normalized = rawItems.map((item) => this.normalizeMessage(item));

        this.messages = normalized.filter((m) => !this.isRollOrCommand(m.data));
        this.rollsHistory = normalized.filter((m) => this.isRollOrCommand(m.data));

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
    const filter = this.searchQuery.trim() ? this.searchQuery.trim() : undefined;

    this.chatService.getMessages(this.campaignId, this.nextCursor, 20, filter).subscribe({
      next: (res) => {
        if (!res.success || !res.data) {
          this.isLoadingMore = false;
          return;
        }

        const rawOlder = res.data.items || [];
        const olderMessages = rawOlder.map((item) => this.normalizeMessage(item));

        const olderChats = olderMessages.filter((m) => !this.isRollOrCommand(m.data));
        const olderRolls = olderMessages.filter((m) => this.isRollOrCommand(m.data));

        this.messages = [...olderChats, ...this.messages];
        this.rollsHistory = [...olderRolls, ...this.rollsHistory];

        this.nextCursor = res.data.nextCursor;
        this.hasMore = res.data.hasMore;
        this.isLoadingMore = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingMore = false;
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

    const charId =
      this.selectedCharacterId && this.selectedCharacterId !== 'null'
        ? this.selectedCharacterId
        : null;

    // Se o texto for um comando (@rpg)
    if (textToSend.startsWith(commandPrefix)) {
      const commandExec = this.chatService.tryExecuteCommand(textToSend, this.campaignId);

      if (commandExec) {
        commandExec.subscribe({
          next: (res: any) => {
            this.isSending = false;
            this.activeTab = 'rolls'; // Redireciona para a aba de rolagens

            // Desembrulha o resultado HTTP corretamente (evita inserir objetos de wrapper genéricos)
            const rawData = res?.data ?? res;
            if (Array.isArray(rawData)) {
              rawData.forEach((item) => this.rollsHistory.push(item));
            } else if (rawData && typeof rawData === 'object' && ('total' in rawData || 'expression' in rawData)) {
              this.rollsHistory.push(rawData);
            }

            this.cdr.detectChanges();
            this.scrollToBottom();
            this.focusInput();
          },
          error: (err) => {
            this.isSending = false;
            this.sendError = err?.error?.message ?? 'Erro ao executar o comando de rolagem.';
            this.cdr.detectChanges();
            this.focusInput();
          },
        });
        return;
      }
    }

    // Envio de mensagem convencional
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
        this.isSending = false;
        this.newMessageText = textToSend;
        this.sendError = err?.error?.message ?? 'Erro ao enviar a mensagem.';
        this.cdr.detectChanges();
        this.focusInput();
      },
    });
  }

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
      .subscribe({ next: () => this.cdr.detectChanges() });
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
        const target =
          this.activeTab === 'rolls'
            ? this.rollsScrollContainer?.nativeElement
            : this.scrollContainer?.nativeElement;

        if (target) {
          target.scrollTop = target.scrollHeight;
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