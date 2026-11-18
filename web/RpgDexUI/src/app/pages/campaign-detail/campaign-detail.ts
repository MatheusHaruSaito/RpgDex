import { Component, inject, OnInit, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CampaignService } from '../../services/campaign-service';
import { CharacterService } from '../../services/character-service';
import { AuthService } from '../../services/auth-service';
import { UserService } from '../../services/user-service';
import { Campaign } from '../../../models/campaign';
import { Character } from '../../../models/character';
import { UserResponse } from '../../../models/userResponse';
import { UpdateCampaignSettingsRequest } from '../../../models/updateCampaignSettingsRequest';
import { EditCampaignModalComponent } from '../../modals/edit-campaign-modal/edit-campaign-modal';
import { CharacterViewerComponent } from '../../pages/character-viewer/character-viewer';
import { CampaignSetActiveStateRequest } from '../../../models/campaignSetActiveStateRequest';
import { CampaignChatComponent } from '../../components/campaign-chat-component/campaign-chat-component';
import { InfoHintComponent } from '../../components/info-hint/info-hint';
import { ReportModalComponent } from '../../modals/report-modal/report-modal';
import { ReportType } from '../../../models/reportType';
import { ErrorHandlerUtil } from '../../utils/error-handler.util';

@Component({
  selector: 'app-campaign-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    EditCampaignModalComponent,
    CharacterViewerComponent,
    CampaignChatComponent,
    InfoHintComponent,
    ReportModalComponent,
  ],
  providers: [DatePipe],
  templateUrl: './campaign-detail.html',
  styleUrls: ['./campaign-detail.css'],
})
export class CampaignDetailComponent implements OnInit {
  @ViewChild('alertBanner') alertBanner?: ElementRef;
  @ViewChild(EditCampaignModalComponent) editCampaignModal?: EditCampaignModalComponent;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private campaignService = inject(CampaignService);
  private characterService = inject(CharacterService);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private cdr = inject(ChangeDetectorRef);
  private datePipe = inject(DatePipe);
  private translateService = inject(TranslateService);

  campaignId = '';
  currentUserId = '';
  campaign?: Campaign;

  isLoading = true;
  isGameMaster = false;
  isPlayerInCampaign = false;
  reportTypes = ReportType;
  usersCache: { [id: string]: UserResponse } = {};

  approvedCharacters: Character[] = [];
  pendingCharacters: Character[] = [];
  expandedCharacterId: string | null = null;

  isEditModalOpen = false;
  requireApproval = true;

  joinPassword = '';
  myCharacters: Character[] = [];
  selectedCharacterId = '';
  selectedGmCharacterId = '';
  copiedFeedback = false;

  // ── TRAVAS DE REQUISIÇÃO (PREVENÇÃO DE SPAM / DUPLICIDADE) ──
  isSubmittingCharacter = false;
  isJoiningCampaign = false;
  isTogglingState = false;
  isTogglingApproval = false;
  isLeavingCampaign = false;
  processingCharacterIds = new Set<string>();
  processingPlayerIds = new Set<string>();

  successMessage: string | null = null;
  errorMessage: string | null = null;
  private feedbackTimeout: any;

  isGmSettingsOpen = false;

  // ── ESTADO DO MODAL DE DENÚNCIA ──
  isReportModalOpen = false;
  reportTargetId = '';
  reportTargetType: ReportType = ReportType.CampaignReport;
  reportTargetName = '';

  ngOnInit(): void {
    this.currentUserId = this.authService.getLoggedUserId() ?? '';
    this.campaignId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.campaignId) {
      this.loadCampaign();
      this.loadMyCharacters();
    } else {
      this.isLoading = false;
    }
  }

  // ── MÉTODOS DE DENÚNCIA ──
  openReportModal(targetId: string, type: ReportType, name: string): void {
    this.reportTargetId = targetId;
    this.reportTargetType = type;
    this.reportTargetName = name;
    this.isReportModalOpen = true;
  }

  onReportModalClosed(success: boolean): void {
    this.isReportModalOpen = false;
  }

  showFeedback(message: string, isError: boolean = false): void {
    if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);

    if (isError) {
      this.errorMessage = message;
      this.successMessage = null;
    } else {
      this.successMessage = message;
      this.errorMessage = null;
    }

    this.cdr.detectChanges();

    setTimeout(() => {
      if (this.alertBanner?.nativeElement) {
        this.alertBanner.nativeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }, 50);

    this.feedbackTimeout = setTimeout(() => {
      this.successMessage = null;
      this.errorMessage = null;
      this.cdr.detectChanges();
    }, 5000);
  }

  private handleApiError(err: any): void {
    ErrorHandlerUtil.parseApiError(err, this.translateService, (msg) => {
      this.showFeedback(msg, true);
    });
  }

  loadCampaign(isSilentReload: boolean = false): void {
    if (!isSilentReload) {
      this.isLoading = true;
    }

    this.campaignService.GetById(this.campaignId).subscribe({
      next: (res) => {
        this.campaign = res.data;
        if (this.campaign) {
          this.isGameMaster = this.campaign.gameMasterId === this.currentUserId;
          this.isPlayerInCampaign =
            !!this.campaign.playerIds?.includes(this.currentUserId) || this.isGameMaster;

          const apiApproval =
            (this.campaign as any).requireApprovalForCharacters ??
            (this.campaign as any).RequireApprovalForCharacters;

          if (typeof apiApproval === 'boolean') {
            this.requireApproval = apiApproval;
          } else if (!isSilentReload) {
            this.requireApproval = true;
          }

          this.loadUsersInfo();
          this.loadApprovedCharacters();
          this.loadPendingCharacters();
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        if (!isSilentReload) {
          this.router.navigate(['/campanhas']);
        }
      },
    });
  }

  loadUsersInfo(): void {
    if (!this.campaign) return;

    const userIdsToFetch = new Set<string>();

    if (this.campaign.gameMasterId) {
      userIdsToFetch.add(this.campaign.gameMasterId);
    }

    if (this.campaign.playerIds) {
      this.campaign.playerIds.forEach((id) => userIdsToFetch.add(id));
    }

    userIdsToFetch.forEach((userId) => {
      if (!this.usersCache[userId]) {
        this.userService.GetById(userId).subscribe({
          next: (res) => {
            if (res.data) {
              this.usersCache[userId] = res.data;
              this.cdr.detectChanges();
            }
          },
        });
      }
    });
  }

  getUser(userId: string): UserResponse | undefined {
    return this.usersCache[userId];
  }

  loadMyCharacters(): void {
    this.characterService.GetAll().subscribe({
      next: (res) => {
        this.myCharacters = res.data?.characters ?? [];
        this.cdr.detectChanges();
      },
    });
  }

  loadApprovedCharacters(): void {
    const uniqueIds = Array.from(new Set(this.campaign?.characterIds ?? []));
    if (uniqueIds.length === 0) {
      this.approvedCharacters = [];
      this.cdr.detectChanges();
      return;
    }

    const requests = uniqueIds.map((id) =>
      this.characterService.GetById(id).pipe(catchError(() => of(null))),
    );

    forkJoin(requests).subscribe((responses) => {
      const loaded: Character[] = [];
      responses.forEach((res) => {
        if (res?.data && !loaded.some((c) => c.id === res.data!.id)) {
          loaded.push(res.data);
          const ownerId = res.data.userId;
          if (ownerId && !this.usersCache[ownerId]) {
            this.userService.GetById(ownerId).subscribe({
              next: (uRes) => {
                if (uRes?.data) {
                  this.usersCache[ownerId] = uRes.data;
                  this.cdr.detectChanges();
                }
              },
            });
          }
        }
      });

      this.approvedCharacters = loaded;
      this.cdr.detectChanges();
    });
  }

  loadPendingCharacters(): void {
    const uniqueIds = Array.from(new Set(this.campaign?.characterRequests ?? []));
    if (uniqueIds.length === 0) {
      this.pendingCharacters = [];
      this.cdr.detectChanges();
      return;
    }

    const requests = uniqueIds.map((id) =>
      this.characterService.GetById(id).pipe(catchError(() => of(null))),
    );

    forkJoin(requests).subscribe((responses) => {
      const loaded: Character[] = [];
      responses.forEach((res) => {
        if (res?.data && !loaded.some((c) => c.id === res.data!.id)) {
          loaded.push(res.data);
          const ownerId = res.data.userId;
          if (ownerId && !this.usersCache[ownerId]) {
            this.userService.GetById(ownerId).subscribe({
              next: (uRes) => {
                if (uRes?.data) {
                  this.usersCache[ownerId] = uRes.data;
                  this.cdr.detectChanges();
                }
              },
            });
          }
        }
      });

      this.pendingCharacters = loaded;
      this.cdr.detectChanges();
    });
  }

  formatNextSession(dateValue: any): string {
    if (!dateValue) return 'A Definir';

    const sessionDate = new Date(dateValue);
    const now = new Date();

    if (isNaN(sessionDate.getTime()) || sessionDate.getFullYear() <= 2000 || sessionDate < now) {
      return 'A Definir';
    }

    return this.datePipe.transform(sessionDate, 'dd/MM/yyyy HH:mm') || 'A Definir';
  }

  toggleCharacter(charId: string): void {
    this.expandedCharacterId = this.expandedCharacterId === charId ? null : charId;
  }

  copyCampaignCode(): void {
    if (!this.campaign?.id) return;
    navigator.clipboard.writeText(this.campaign.id);
    this.copiedFeedback = true;
    setTimeout(() => {
      this.copiedFeedback = false;
      this.cdr.detectChanges();
    }, 2000);
  }

  openBoard(): void {
    if (!this.campaign?.isActive) {
      this.showFeedback('Reative a campanha para acessar o tabuleiro virtual.', true);
      return;
    }
    this.router.navigate(['/campanha', this.campaignId, 'tabuleiro']);
  }

  joinCampaign(): void {
    if (!this.campaign || this.isJoiningCampaign) return;

    if (!this.campaign.isActive) {
      this.showFeedback('Não é possível entrar em uma campanha desativada.', true);
      return;
    }

    this.isJoiningCampaign = true;
    this.campaignService
      .AddPlayer({
        campaignId: this.campaign.id,
        password: this.joinPassword,
      })
      .subscribe({
        next: () => {
          this.isJoiningCampaign = false;
          this.showFeedback('Você entrou na campanha com sucesso!');
          this.joinPassword = '';
          this.loadCampaign(true);
        },
        error: (err) => {
          this.isJoiningCampaign = false;
          this.cdr.detectChanges();
          this.handleApiError(err);
        },
      });
  }

  submitCharacter(customCharId?: string): void {
    const charId = customCharId || this.selectedCharacterId;
    if (!this.campaign || !charId || this.isSubmittingCharacter) return;

    const alreadyInCampaign =
      this.pendingCharacters.some((c) => c.id === charId) ||
      this.approvedCharacters.some((c) => c.id === charId);

    if (alreadyInCampaign) {
      this.showFeedback(
        'Este personagem já foi enviado ou já está vinculado a esta campanha.',
        true,
      );
      return;
    }

    this.isSubmittingCharacter = true;
    this.campaignService
      .AddCharacter({
        campaignId: this.campaign.id,
        characterId: charId,
      })
      .subscribe({
        next: () => {
          this.isSubmittingCharacter = false;
          this.selectedGmCharacterId = '';
          this.selectedCharacterId = '';
          this.showFeedback('Ficha vinculada/enviada com sucesso!');
          this.loadCampaign(true);
        },
        error: (err) => {
          this.isSubmittingCharacter = false;
          this.cdr.detectChanges();
          this.handleApiError(err);
        },
      });
  }

  handleCharacterApproval(characterId: string, approve: boolean): void {
    if (!this.campaign || this.processingCharacterIds.has(characterId)) return;

    this.processingCharacterIds.add(characterId);
    this.campaignService
      .AcceptCharacter({
        userId: this.currentUserId,
        campaignId: this.campaign.id,
        characterId: characterId,
        IsAccepted: approve,
      })
      .subscribe({
        next: () => {
          this.processingCharacterIds.delete(characterId);
          this.showFeedback(approve ? 'Personagem aprovado na campanha!' : 'Solicitação recusada.');
          this.loadCampaign(true);
        },
        error: (err) => {
          this.processingCharacterIds.delete(characterId);
          this.cdr.detectChanges();
          this.handleApiError(err);
        },
      });
  }

  removeCharacter(characterId: string): void {
    if (!this.campaign || !this.isGameMaster || this.processingCharacterIds.has(characterId))
      return;

    if (!confirm('Tem certeza de que deseja remover este personagem da campanha?')) return;

    this.processingCharacterIds.add(characterId);
    this.campaignService
      .RemoveCharacter({
        campaignId: this.campaign.id,
        characterId: characterId,
      })
      .subscribe({
        next: () => {
          this.processingCharacterIds.delete(characterId);
          this.showFeedback('Personagem removido com sucesso!');
          this.loadCampaign(true);
        },
        error: (err) => {
          this.processingCharacterIds.delete(characterId);
          this.cdr.detectChanges();
          this.handleApiError(err);
        },
      });
  }

  removePlayer(userId: string): void {
    if (!this.campaign || this.processingPlayerIds.has(userId)) return;

    const confirmMsg = 'Tem certeza de que deseja remover este jogador?';
    if (!confirm(confirmMsg)) return;

    this.processingPlayerIds.add(userId);
    this.campaignService
      .RemovePlayer({
        campaignId: this.campaign.id,
        playerId: userId,
        issuerPlayerId: this.currentUserId,
      })
      .subscribe({
        next: () => {
          this.processingPlayerIds.delete(userId);
          if (userId === this.currentUserId) {
            this.router.navigate(['/campanhas']);
          } else {
            this.showFeedback('Jogador removido com sucesso.');
            this.loadCampaign(true);
          }
        },
        error: (err) => {
          this.processingPlayerIds.delete(userId);
          this.cdr.detectChanges();
          this.handleApiError(err);
        },
      });
  }

  toggleActiveState(): void {
    if (!this.campaign || this.isTogglingState) return;

    const newState = !this.campaign.isActive;
    const request: CampaignSetActiveStateRequest = {
      id: this.campaign.id,
      state: newState,
    };

    this.isTogglingState = true;
    this.campaignService.SetActiveState(request).subscribe({
      next: () => {
        this.isTogglingState = false;
        this.showFeedback(`Campanha ${newState ? 'reativada' : 'desativada'} com sucesso!`);
        this.loadCampaign(true);
      },
      error: (err) => {
        this.isTogglingState = false;
        this.cdr.detectChanges();
        this.handleApiError(err);
      },
    });
  }

  toggleRequireApproval(): void {
    if (!this.campaign || this.isTogglingApproval) return;

    const previousState = this.requireApproval;
    this.requireApproval = !this.requireApproval;

    const request: UpdateCampaignSettingsRequest = {
      campaignId: this.campaign.id,
      RequireApprovalForCharacters: this.requireApproval,
    };

    this.isTogglingApproval = true;
    this.campaignService.UpdateSettings(request).subscribe({
      next: () => {
        this.isTogglingApproval = false;
        if (this.campaign) {
          this.campaign.requireApprovalForCharacters = this.requireApproval;
        }
        this.showFeedback(
          this.requireApproval
            ? 'Aprovação manual ativada com sucesso!'
            : 'Aprovação manual desativada. Novos personagens entrarão diretamente.',
        );
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isTogglingApproval = false;
        this.requireApproval = previousState;
        this.cdr.detectChanges();
        this.handleApiError(err);
      },
    });
  }

  saveCampaignChanges(eventData: any): void {
    this.campaignService.Update(eventData).subscribe({
      next: (res) => {
        this.isEditModalOpen = false;

        if (res && res.data) {
          this.campaign = res.data;

          if (this.campaign.iconPath) {
            const separator = this.campaign.iconPath.includes('?') ? '&' : '?';
            this.campaign.iconPath = `${this.campaign.iconPath}${separator}t=${new Date().getTime()}`;
          }
        }

        this.showFeedback('Campanha atualizada com sucesso!');

        this.cdr.detectChanges();
        this.loadCampaign(true);
      },
      error: (err) => {
        if (this.editCampaignModal) {
          this.editCampaignModal.handleError(err);
        } else {
          this.handleApiError(err);
        }
      },
    });
  }

  leaveCampaign(userId: string): void {
    if (this.isLeavingCampaign) return;
    if (!confirm('Tem certeza de que deseja sair desta campanha?')) return;

    this.isLeavingCampaign = true;
    this.campaignService.LeaveCampaign({ campaignId: userId }).subscribe({
      next: () => {
        this.isLeavingCampaign = false;
        this.router.navigate(['/campanhas']);
      },
      error: (err) => {
        this.isLeavingCampaign = false;
        this.cdr.detectChanges();
        this.handleApiError(err);
      },
    });
  }
}
