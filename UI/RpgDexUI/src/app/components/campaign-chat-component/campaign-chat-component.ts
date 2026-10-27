import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatMessage } from '../../../models/chatMessage';
import { CampaignChatMessageRequest } from '../../../models/campaignChatMessageRequest';
import { Character } from '../../../models/character';
import { AuthService } from '../../services/auth-service';
import { CampaignChatService } from '../../services/campaign-chat-service';
import { CampaignService } from '../../services/campaign-service';
import { CharacterService } from '../../services/character-service';
import { UserService } from '../../services/user-service';
import { DiceRollsLogResult } from '../../../models/diceRollsLogResult';
import { DiceRollEntryDto } from '../../../models/diceRollEntryDto';
import { CampaignChatMessageRequest } from '../../../models/campaignChatMessageRequest';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { ErrorHandlerUtil } from '../../utils/error-handler.util';

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
  private chatService = inject(CampaignChatService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private translateService = inject(TranslateService);

  messages: ChatMessage[] = [];
  rollsLog: DiceRollsLogResult[] = [];

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
  isLoadingRolls: boolean = false;
  isLoadingMore: boolean = false;
  isSending: boolean = false;
  sendError: string = '';

  isMinimized: boolean = false;
  unreadCount: number = 0;

  usersCache: { [id: string]: any } = {};

  private chatSubscription!: Subscription;

  constructor(
    private chatService: CampaignChatService,
    private campaignService: CampaignService,
    private authService: AuthService,
    private characterService: CharacterService,
    private userService: UserService,
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

    this.initialLoadChat();
    this.loadRollsLog();

    this.chatSubscription = this.chatService.onMessageReceived().subscribe((msg: any) => {
      this.ngZone.run(() => {
        const normalizedMsg = this.normalizeMessage(msg);
        const index = normalizedMsg.id
          ? this.messages.findIndex((m) => m.id === normalizedMsg.id)
          : -1;

        if (index !== -1) {
          this.messages[index] = normalizedMsg;
          this.messages = [...this.messages];
        } else {
          this.messages = [...this.messages, normalizedMsg];
        }

        if (this.isRollOrCommand(normalizedMsg)) {
          this.loadRollsLog();
        }

        if (this.isMinimized) {
          this.unreadCount++;
        } else if (this.activeTab === 'chat') {
          this.scrollToBottom();
        }
        this.cdr.detectChanges();
      });
    });
  }

  get chatMessagesOnly(): ChatMessage[] {
    return this.messages.filter((m) => !this.isRollOrCommand(m));
  }

  isRollOrCommand(msg: any): boolean {
    if (!msg) return false;

    const text = typeof msg === 'string' ? msg : msg.data || '';
    const username = typeof msg === 'object' ? msg.username || msg.userName || '' : '';

    const trimmed = text.trim();
    const lower = text.toLowerCase();
    const upperUser = username.toUpperCase();

    if (
      upperUser.includes('RPG DEX') ||
      upperUser.includes('RPGDEX') ||
      upperUser.includes('SYSTEM') ||
      upperUser.includes('BOT')
    ) {
      return true;
    }

    if (trimmed.startsWith(this.chatService.commandPrefix)) {
      return true;
    }

    if (
      trimmed.includes('#') ||
      trimmed.includes('🎲') ||
      trimmed.includes('->') ||
      /\b\d*d\d+\b/i.test(trimmed) ||
      lower.includes('rolou') ||
      lower.includes('resultado') ||
      lower.includes('rolagem')
    ) {
      return true;
    }

    return false;
  }

  getRollUser(roll: any): string {
    if (!roll) return 'Jogador';

    const userId = roll.userId || roll.UserId;
    if (userId) {
      const cached = this.usersCache[userId];
      if (cached) {
        return cached.displayName || cached.userName || cached.username || 'Jogador';
      }
      this.fetchUser(userId);
    }

    return 'Jogador';
  }

  private fetchUser(userId: string): void {
    if (!userId || this.usersCache[userId]) return;
    this.userService.GetById(userId).subscribe({
      next: (res) => {
        if (res.data) {
          this.usersCache[userId] = res.data;
          this.cdr.detectChanges();
        }
      },
    });
  }

  getRollEntries(roll: any): DiceRollEntryDto[] {
    if (!roll) return [];
    return roll.entires || roll.Entires || [];
  }

  getRollTotal(roll: any): number {
    if (!roll) return 0;
    const entries = this.getRollEntries(roll);
    if (entries.length > 0) {
      return entries.reduce((acc, entry) => acc + (entry.total ?? 0), 0);
    }
    return roll.total ?? roll.Total ?? 0;
  }

  setTab(tab: 'chat' | 'rolls'): void {
    this.activeTab = tab;
    if (tab === 'rolls') {
      this.loadRollsLog();
    }
    this.cdr.detectChanges();
    setTimeout(() => this.scrollToBottom(), 50);
    this.focusInput();
  }

  loadRollsLog(): void {
    if (!this.campaignId) return;
    this.isLoadingRolls = true;

    this.campaignService.GetRollsLog(this.campaignId).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        this.rollsLog = Array.isArray(data) ? data : [];
        this.isLoadingRolls = false;
        this.cdr.detectChanges();

        this.rollsLog.forEach((roll) => {
          const uId = roll.userId || (roll as any).UserId;
          if (uId) this.fetchUser(uId);
        });

        if (this.activeTab === 'rolls') {
          setTimeout(() => this.scrollToBottom(), 50);
        }
      },
      error: (err) => {
        console.error('Erro ao buscar log de rolagens:', err);
        this.isLoadingRolls = false;
        this.cdr.detectChanges();
      },
    });
  }

  get rollsList(): any[] {
    return this.rollsLog;
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

  initialLoadChat(): void {
    this.isInitialLoading = true;
    const filter = this.searchQuery.trim() ? this.searchQuery.trim() : undefined;

    this.chatService.getMessages(this.campaignId, undefined, 30, filter).subscribe({
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
    this.initialLoadChat();
  }

  toggleSearch(): void {
    this.showSearchInput = !this.showSearchInput;
    if (!this.showSearchInput) {
      this.searchQuery = '';
      this.initialLoadChat();
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

        this.messages = [...olderMessages, ...this.messages];
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

    if (textToSend.startsWith(commandPrefix)) {
      const commandExec = this.chatService.tryExecuteCommand(textToSend, this.campaignId);

      if (commandExec) {
        commandExec.subscribe({
          next: () => {
            this.isSending = false;
            this.activeTab = 'rolls';
            this.loadRollsLog();
            this.cdr.detectChanges();
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

    const request: CampaignChatMessageRequest = {
      campaignId: this.campaignId,
      characterId: charId,
      message: textToSend,
    };

    this.chatService.sendMessage(request).subscribe({
      next: () => {
        this.isSending = false;
        this.cdr.detectChanges();
        this.focusInput();
      },
      error: (err) => {
        this.isSending = false;
        this.newMessageText = textToSend;
        ErrorHandlerUtil.parseApiError(err, this.translateService, (msg) => {
          this.sendError = msg;
          this.cdr.detectChanges();
        });
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
      this.focusInput();
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
    setTimeout(() => {
      if (this.chatInput && this.chatInput.nativeElement) {
        this.chatInput.nativeElement.focus();
      }
    }, 50);
  }

  ngOnDestroy(): void {
    this.chatService.stopConnection(this.campaignId);
    this.chatSubscription?.unsubscribe();
  }
}