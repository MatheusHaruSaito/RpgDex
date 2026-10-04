import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { CharacterService } from '../../services/character-service';
import { CampaignService } from '../../services/campaign-service';
import { UserResponse } from '../../../models/userResponse';
import { Character } from '../../../models/character';
import { AuthOptionsResponse } from '../../../models/authOptionsResponse';
import { SettingsModalComponent } from '../../modals/settings-modal/settings-modal';
import { Campaign } from '../../../models/campaign';
import { SkeletonComponent } from '../../components/skeleton/skeleton';

const THEME_KEY = 'rpgdex-theme';

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
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  user: UserResponse | null = null;
  authOptions: AuthOptionsResponse | null = null;
  isDarkMode = false;
  isSettingsModalOpen = false;

  // Estados de carregamento com Skeleton
  isLoadingUser = true;
  isLoadingCharacters = true;
  isLoadingCampaigns = true;

  characterPreview: Character[] = [];
  characterTotal = 0;

  campaignPreview: CampaignDisplayItem[] = [];
  campaignTotal = 0;

  ngOnInit(): void {
    this.initTheme();
    this.loadUser();
    this.loadCharacterPreview();
    this.loadCampaignPreview();
  }

  private initTheme(): void {
    const saved = localStorage.getItem(THEME_KEY);
    this.isDarkMode = saved === 'dark';
    this.applyTheme();
  }

  private applyTheme(): void {
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem(THEME_KEY, this.isDarkMode ? 'dark' : 'light');
    this.applyTheme();
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
        console.error('Erro ao carregar usuário', err);
        this.isLoadingUser = false;
        this.logout();
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
      error: (err) => console.error('Erro ao carregar opções de autenticação', err),
    });
  }

  private loadCharacterPreview(): void {
    this.isLoadingCharacters = true;
    this.characterService.GetAllByPage(1, 3).subscribe({
      next: (response) => {
        this.characterTotal = response.data?.characterLenght ?? 0;
        this.characterPreview = response.data?.characters ?? [];
        this.isLoadingCharacters = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao carregar personagens', err);
        this.isLoadingCharacters = false;
        this.cdr.detectChanges();
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
        this.campaignTotal = response.data?.campaignLenght ?? 0;
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
        console.error('Erro ao carregar campanhas', err);
        this.isLoadingCampaigns = false;
        this.cdr.detectChanges();
      },
    });
  }

  editProfile(): void {
    this.router.navigate(['/perfil/editar']);
  }

  logout(): void {
    this.authService.Logout();
    this.router.navigate(['/login']);
  }
}