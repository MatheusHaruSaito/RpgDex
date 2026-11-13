import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth-service';
import { CharacterService } from '../../services/character-service';
import { CampaignService } from '../../services/campaign-service';
import { PlanService } from '../../services/plan-service';
import { SubscriptionService } from '../../services/subscription-service';
import { ThemeService } from '../../services/theme-service';
import { UserResponse } from '../../../models/userResponse';
import { Character } from '../../../models/character';
import { AuthOptionsResponse } from '../../../models/authOptionsResponse';
import { SettingsModalComponent } from '../../modals/settings-modal/settings-modal';
import { Campaign } from '../../../models/campaign';
import { SkeletonComponent } from '../../components/skeleton/skeleton';
import { ErrorHandlerUtil } from '../../utils/error-handler.util';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface CampaignDisplayItem {
  id: string;
  title: string;
  role: string;
  iconPath?: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, SettingsModalComponent, SkeletonComponent],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css'],
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private characterService = inject(CharacterService);
  private campaignService = inject(CampaignService);
  private planService = inject(PlanService);
  private subscriptionService = inject(SubscriptionService);
  private theme = inject(ThemeService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private translateService = inject(TranslateService);

  user: UserResponse | null = null;
  userPlanName = 'Plano Gratuito';
  hasEarlyAccess = false;
  authOptions: AuthOptionsResponse | null = null;
  isSettingsModalOpen = false;

  // Estados de carregamento com Skeleton
  isLoadingUser = true;
  isLoadingPlan = true;
  isLoadingCharacters = true;
  isLoadingCampaigns = true;

  characterPreview: Character[] = [];
  characterTotal = 0;
  maxCharacters = 0;

  feedBackMessage = { text: '', type: '' };

  campaignPreview: CampaignDisplayItem[] = [];
  campaignGameMasterLength = 0;
  campaignPlayerLength = 0;
  maxCampaigns = 0;

  /** O tema agora vive no ThemeService (global); o template continua usando isDarkMode. */
  get isDarkMode(): boolean {
    return this.theme.isDark();
  }

  get hasCharacterLimit(): boolean {
    return this.maxCharacters > 0;
  }

  get isCharacterLimitReached(): boolean {
    return this.hasCharacterLimit && this.characterTotal >= this.maxCharacters;
  }

  get isCharacterNearLimit(): boolean {
    return (
      this.hasCharacterLimit &&
      !this.isCharacterLimitReached &&
      this.characterTotal / this.maxCharacters >= 0.8
    );
  }

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

  get totalCampaignsCount(): number {
    return this.campaignGameMasterLength + this.campaignPlayerLength;
  }

  constructor(private activatedRoute: ActivatedRoute) {}

  ngOnInit(): void {
    this.HandleFeedBackMessage();
    this.loadUser();
    this.loadUserPlanInfo();
    this.loadCharacterPreview();
    this.loadCampaignPreview();
  }

  private HandleFeedBackMessage(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      if (params['error']) {
        const err = { error: { errors: [{ code: params['error'] }] } };
        ErrorHandlerUtil.parseApiError(err, this.translateService, (msg) => {
          this.feedBackMessage = { text: msg, type: 'error' };
          this.cdr.detectChanges();
          this.isSettingsModalOpen = true;
        });
      } else if (params['linked']) {
        this.feedBackMessage = {
          text: 'Conta vinculada com ' + params['linked'] + ' com sucesso!',
          type: 'success',
        };
        this.cdr.detectChanges();
        this.isSettingsModalOpen = true;
      }
    });
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  private loadUser(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.isLoadingUser = true;
    this.authService.GetLoggedUser().subscribe({
      next: (response) => {
        this.user = response.data ?? null;
        this.isLoadingUser = false;
        this.cdr.detectChanges();

        if (this.user?.id) {
          this.loadAuthOptions(this.user.id);
        }
      },
      error: (err) => {
        this.isLoadingUser = false;
        ErrorHandlerUtil.parseApiError(err, this.translateService, () => {
          this.logout();
        });
      },
    });
  }

  private loadUserPlanInfo(): void {
    this.isLoadingPlan = true;

    forkJoin({
      userPlans: this.subscriptionService.GetAllUserPlanInfo().pipe(catchError(() => of(null))),
      earlyAccess: this.subscriptionService.HasEarlyAccess().pipe(catchError(() => of(false))),
    }).subscribe({
      next: ({ userPlans, earlyAccess }) => {
        this.hasEarlyAccess = !!earlyAccess;

        if (userPlans?.data && userPlans.data.length > 0) {
          const activeSub = userPlans.data[0];
          this.userPlanName = activeSub.planName || 'Plano VIP';
        } else {
          this.userPlanName = 'Plano Gratuito';
        }

        this.isLoadingPlan = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.userPlanName = 'Plano Gratuito';
        this.isLoadingPlan = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadAuthOptions(userId: string): void {
    this.authService.GetUserAuthOptions(userId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.authOptions = res.data;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        ErrorHandlerUtil.parseApiError(err, this.translateService, () => {
          this.cdr.detectChanges();
        });
      },
    });
  }

  private loadCharacterPreview(): void {
    this.isLoadingCharacters = true;
    this.characterService.GetAllByPage(1, 3).subscribe({
      next: (response) => {
        this.characterPreview = response.data?.characters ?? [];
        this.characterTotal = response.data?.characterLength ?? this.characterPreview.length;
        this.maxCharacters = response.data?.maxCharacters ?? 0;
        this.isLoadingCharacters = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoadingCharacters = false;
        ErrorHandlerUtil.parseApiError(err, this.translateService, () => {
          this.cdr.detectChanges();
        });
      },
    });
  }

  private loadCampaignPreview(): void {
    const userId = this.authService.getLoggedUserId();
    if (!userId) {
      this.isLoadingCampaigns = false;
      return;
    }

    this.isLoadingCampaigns = true;
    this.campaignService.GetAllByUserPage(0, 3).subscribe({
      next: (response) => {
        const allCampaigns: Campaign[] = response.data?.campaigns ?? [];
        this.campaignGameMasterLength =
          response.data?.campaignGameMasterLength ??
          allCampaigns.filter((c) => c.gameMasterId === userId).length;
        this.campaignPlayerLength =
          response.data?.campaignPlayerLength ??
          allCampaigns.filter((c) => c.gameMasterId !== userId).length;
        this.maxCampaigns = response.data?.maxCampaigns ?? 0;

        this.campaignPreview = allCampaigns.map((c) => ({
          id: c.id,
          title: c.title,
          role: c.gameMasterId === userId ? 'Mestre' : 'Jogador',
          iconPath: c.iconPath,
        }));

        this.isLoadingCampaigns = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoadingCampaigns = false;
        ErrorHandlerUtil.parseApiError(err, this.translateService, () => {
          this.cdr.detectChanges();
        });
      },
    });
  }

  openSettingsModal(): void {
    this.isSettingsModalOpen = true;
  }

  closeSettingsModal(): void {
    this.isSettingsModalOpen = false;
  }

  onTwoFactorUpdated(isEnabled: boolean): void {
    if (this.authOptions) {
      this.authOptions.isTwoFactorEnabled = isEnabled;
    }
  }

  editProfile(): void {
    this.router.navigate(['/perfil/editar']);
  }

  logout(): void {
    this.authService.Logout();
    this.router.navigate(['/login']);
  }
}