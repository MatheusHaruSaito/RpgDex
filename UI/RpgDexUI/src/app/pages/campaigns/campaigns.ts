import { Component, inject, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { CharacterService } from '../../services/character-service';
import { AuthService } from '../../services/auth-service';
import { CampaignService } from '../../services/campaign-service';
import { Character } from '../../../models/character';
import { Campaign } from '../../../models/campaign';
import { CreateJoinCampaignModalComponent } from '../../modals/create-join-campaign-modal/create-join-campaign-modal';
import { SkeletonComponent } from '../../components/skeleton/skeleton';
import { ReportModalComponent } from '../../modals/report-modal/report-modal';
import { ReportType } from '../../../models/reportType';
import { ErrorHandlerUtil } from '../../utils/error-handler.util';

@Component({
  selector: 'app-campaigns',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CreateJoinCampaignModalComponent,
    SkeletonComponent,
    ReportModalComponent,
  ],
  templateUrl: './campaigns.html',
  styleUrls: ['./campaigns.css'],
})
export class CampaignsComponent implements OnInit {
  @ViewChild(CreateJoinCampaignModalComponent) campaignModal!: CreateJoinCampaignModalComponent;

  private characterService = inject(CharacterService);
  private campaignService = inject(CampaignService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private translateService = inject(TranslateService);

  myCampaigns: Campaign[] = [];
  myCharacters: Character[] = [];
  currentUserId = '';
  reportTypes = ReportType;

  campaignGameMasterLength = 0;
  campaignPlayerLength = 0;
  maxCampaigns = 0;

  // Estados de carregamento
  isLoadingCampaigns = true;
  isLoadingCharacters = true;

  showCharactersCount = 5;

  campaingPageCount = 2;
  campaingsPerPage = 4;

  showMoreButton = false;
  isModalOpen = false;
  activeModalTab: 'create' | 'join' = 'create';

  // ── ESTADO DO MODAL DE DENÚNCIA ──
  isReportModalOpen = false;
  reportTargetId = '';
  reportTargetType: ReportType = ReportType.CampaignReport;
  reportTargetName = '';

  get hasCampaignLimit(): boolean {
    return this.maxCampaigns > 0;
  }

  get isCampaignLimitReached(): boolean {
    return this.hasCampaignLimit && this.campaignGameMasterLength >= this.maxCampaigns;
  }

  get isCampaignNearLimit(): boolean {
    return (
      this.hasCampaignLimit &&
      !this.isCampaignLimitReached &&
      this.campaignGameMasterLength / this.maxCampaigns >= 0.8
    );
  }

  ngOnInit(): void {
    this.currentUserId = this.authService.getLoggedUserId() ?? '';
    if (this.currentUserId) {
      this.loadCampaigns();
      this.loadCharacters();
    } else {
      this.isLoadingCampaigns = false;
      this.isLoadingCharacters = false;
    }
  }

  // ── MÉTODOS DE DENÚNCIA ──
  openReportModal(event: Event, targetId: string, type: ReportType, name: string): void {
    event.stopPropagation();
    this.reportTargetId = targetId;
    this.reportTargetType = type;
    this.reportTargetName = name;
    this.isReportModalOpen = true;
  }

  onReportModalClosed(success: boolean): void {
    this.isReportModalOpen = false;
  }

  public showMoreCampaigns(): void {
    this.campaignService.GetAllByUserPage(this.campaingPageCount, this.campaingsPerPage).subscribe({
      next: (result) => {
        const fetched = result.data?.campaigns ?? [];
        this.myCampaigns.push(...fetched);
        if (result.data?.campaignGameMasterLength !== undefined) {
          this.campaignGameMasterLength = result.data.campaignGameMasterLength;
        }
        if (result.data?.campaignPlayerLength !== undefined) {
          this.campaignPlayerLength = result.data.campaignPlayerLength;
        }
        if (result.data?.maxCampaigns !== undefined) {
          this.maxCampaigns = result.data.maxCampaigns;
        }
        this.campaingPageCount++;
        if (fetched.length < 3) {
          this.showMoreButton = false;
        }
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  private loadCampaigns(): void {
    this.isLoadingCampaigns = true;
    this.campaignService.GetAllByUserPage(0, this.campaingsPerPage).subscribe({
      next: (r) => {
        const campaigns = r.data?.campaigns ?? [];
        this.showMoreButton = campaigns.length > this.campaingsPerPage - 1;
        this.myCampaigns = campaigns;
        this.campaignGameMasterLength =
          r.data?.campaignGameMasterLength ??
          campaigns.filter((c) => c.gameMasterId === this.currentUserId).length;
        this.campaignPlayerLength =
          r.data?.campaignPlayerLength ??
          campaigns.filter((c) => c.gameMasterId !== this.currentUserId).length;
        this.maxCampaigns = r.data?.maxCampaigns ?? 0;
        this.isLoadingCampaigns = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingCampaigns = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadCharacters(): void {
    this.isLoadingCharacters = true;
    this.characterService.GetAllByPage(1, this.showCharactersCount).subscribe({
      next: (r) => {
        const all = r.data?.characters ?? [];
        const filtered = all.filter((c) => c.userId === this.currentUserId);

        this.myCharacters = this.sortByLastAccessed(filtered);
        this.isLoadingCharacters = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingCharacters = false;
        this.cdr.detectChanges();
      },
    });
  }

  // --- LÓGICA DE ÚLTIMO ACESSO ---
  private sortByLastAccessed(chars: Character[]): Character[] {
    return [...chars].sort((a, b) => {
      const timeA = a.lastAccess ? new Date(a.lastAccess).getTime() : 0;
      const timeB = b.lastAccess ? new Date(b.lastAccess).getTime() : 0;

      return timeB - timeA;
    });
  }

  openCharacter(id: string): void {
    this.router.navigate(['/personagens', id]);
  }

  lastAccessedLabel(id: string): string {
    const character = this.myCharacters.find((c) => c.id == id);

    if (!character || !character.lastAccess) {
      return 'Nunca acessado';
    }
    const diffInSeconds = Math.floor(
      (Date.now() - new Date(character!.lastAccess).getTime()) / 1000,
    );
    if (!this.wasAccessed(id)) return 'Nunca acessado';
    if (diffInSeconds < 60) return 'Agora mesmo';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min atrás`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h atrás`;
    return `${Math.floor(diffInSeconds / 86400)}d atrás`;
  }

  wasAccessed(id: string): boolean {
    const char = this.myCharacters.find((c) => c.id == id);
    if (!char || !char.lastAccess) {
      return false;
    }

    const accessDate = new Date(char.lastAccess);
    return !isNaN(accessDate.getTime()) && accessDate.getFullYear() > 1;
  }

  // --- MODAL & CAMPANHAS ---
  openModal(tab: 'create' | 'join'): void {
    if (tab === 'create' && this.isCampaignLimitReached) {
      return;
    }
    this.activeModalTab = tab;
    this.isModalOpen = true;
  }

  handleCreateCampaign(formData: FormData): void {
    this.campaignService.Post(formData as any).subscribe({
      next: () => {
        this.isModalOpen = false;
        this.campaingPageCount = 2;
        this.loadCampaigns();
      },
      error: (err: any) => {
        this.handleApiError(err);
      },
    });
  }

  handleJoinCampaign(payload: { campaignId: string; password?: string }): void {
    const requestBody = {
      campaignId: payload.campaignId,
      password: payload.password ?? '',
    };

    this.campaignService.AddPlayer(requestBody as any).subscribe({
      next: () => {
        this.isModalOpen = false;
        this.campaingPageCount = 2;
        this.loadCampaigns();
      },
      error: (err: any) => {
        this.handleApiError(err);
      },
    });
  }

  private handleApiError(err: any): void {
    ErrorHandlerUtil.parseApiError(err, this.translateService, (msg) => {
      this.setModalError(msg);
    });
  }

  private setModalError(msg: string): void {
    if (this.campaignModal) {
      this.campaignModal.setErrorMessage(msg);
    }
  }

  goToCampaignDetail(id: string): void {
    this.router.navigate(['/campanha', id]);
  }

  formatNextSession(dateValue: any): string {
    if (!dateValue) return 'A Definir';

    const sessionDate = new Date(dateValue);
    const now = new Date();

    if (isNaN(sessionDate.getTime()) || sessionDate.getFullYear() <= 2000 || sessionDate < now) {
      return 'A Definir';
    }

    return sessionDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  }
}