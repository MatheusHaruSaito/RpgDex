import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { ReportService } from '../../services/report-service';
import { UserService } from '../../services/user-service';
import { CampaignService } from '../../services/campaign-service';
import { CharacterService } from '../../services/character-service';
import { ReportDetail } from '../../../models/reportDetailBase';
import { ChartResponse } from '../../../models/chartResponse';
import { ReportType } from '../../../models/reportType';
import { ReportResponse } from '../../../models/reportResponse';
import { ApiResponse } from '../../../models/apiResponse';
import { UserSummary } from '../../../models/userSummary';
import { environment } from '../../../environments/environment';

export type AdminTab = 'reportes' | 'usuarios' | 'personagens' | 'campanhas';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css'],
})
export class AdminComponent implements OnInit, OnDestroy {
  private reportService = inject(ReportService);
  private userService = inject(UserService);
  private campaignService = inject(CampaignService);
  private characterService = inject(CharacterService);
  private cdr = inject(ChangeDetectorRef);

  private refreshTimer?: ReturnType<typeof setInterval>;
  private readonly refreshIntervalMs = 30_000;

  public ReportType = ReportType;
  activeTab: AdminTab = 'reportes';

  // Reportes
  reports: ReportResponse[] = [];
  selectedReport: ReportDetail | null = null;
  totalOpenReports: number = 0;
  isLoadingReports = false;
  showOnlyActive = true;
  currentPage = 1;
  pageSize = 10;

  // Pesquisa de Usuários (Target)
  userSearchTarget: string = '';
  searchedUsers: UserSummary[] = [];
  isSearchingUsers = false;
  hasSearchedUsers = false;
  userSearchError: string = '';
  userSearchPage = 1;
  userSearchPageSize = 10;
  hasMoreUsers = false;
  copiedUserId: string | null = null;

  // Gráficos e Período
  startDate: string = '2026-01-01';
  endDate: string = '2027-01-01';

  userChartData: ChartResponse | null = null;
  characterChartData: ChartResponse | null = null;
  campaignChartData: ChartResponse | null = null;
  isLoadingUserChart = false;

  userChart: ChartData<'line'> | null = null;
  characterChart: ChartData<'line'> | null = null;
  campaignChart: ChartData<'line'> | null = null;

  lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.y} registro(s)` } },
    },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 } },
      x: { grid: { display: false } },
    },
  };

  /** Extrai e unifica qualquer formato de imagem vindo da API */
  get reportImages(): string[] {
    if (!this.selectedReport) return [];

    const repAny = this.selectedReport as any;
    if (Array.isArray(repAny.imagePaths) && repAny.imagePaths.length > 0) {
      return repAny.imagePaths;
    }
    if (Array.isArray(repAny.imagesPath) && repAny.imagesPath.length > 0) {
      return repAny.imagesPath;
    }
    if (typeof repAny.imagePath === 'string' && repAny.imagePath.trim() !== '') {
      return [repAny.imagePath];
    }
    const currentListItem = this.reports.find((r) => r.id === this.selectedReport?.id) as any;
    if (currentListItem) {
      if (Array.isArray(currentListItem.imagesPath) && currentListItem.imagesPath.length > 0) {
        return currentListItem.imagesPath;
      }
      if (Array.isArray(currentListItem.imagePaths) && currentListItem.imagePaths.length > 0) {
        return currentListItem.imagePaths;
      }
      if (
        typeof currentListItem.imagePath === 'string' &&
        currentListItem.imagePath.trim() !== ''
      ) {
        return [currentListItem.imagePath];
      }
    }

    return [];
  }

  getImageUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
      return path;
    }
    const baseUrl = environment.RpxDexApi.replace(/\/api\/?$/i, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
  }

  ngOnInit(): void {
    this.loadReports();

    this.refreshTimer = setInterval(() => {
      if (this.activeTab === 'reportes' && !this.isLoadingReports && !document.hidden) {
        this.loadReports(true);
      }
    }, this.refreshIntervalMs);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  setTab(tab: AdminTab): void {
    this.activeTab = tab;
    if (tab === 'reportes') {
      this.loadReports();
    } else if (tab === 'usuarios') {
      this.loadUserChart();
    } else if (tab === 'personagens') {
      this.loadCharacterChart();
    } else if (tab === 'campanhas') {
      this.loadCampaignChart();
    }
  }

  // ── PESQUISA DE USUÁRIOS POR TARGET ─────────────────────────────
  searchUsers(resetPage = true): void {
    const target = this.userSearchTarget.trim();

    if (!target) {
      this.userSearchError = 'Digite um nome de usuário ou e-mail para pesquisar.';
      this.searchedUsers = [];
      this.hasSearchedUsers = false;
      this.cdr.detectChanges();
      return;
    }

    if (resetPage) {
      this.userSearchPage = 1;
    }

    this.isSearchingUsers = true;
    this.userSearchError = '';
    this.cdr.detectChanges();

    this.userService
      .GetUserSummaryByUserNameOrEmail(
        target,
        String(this.userSearchPage),
        String(this.userSearchPageSize),
      )
      .subscribe({
        next: (res: ApiResponse<any>) => {
          this.isSearchingUsers = false;
          this.hasSearchedUsers = true;

          if (res.success && res.data) {
            const list = Array.isArray(res.data)
              ? res.data
              : res.data.items || res.data.users || [];
            this.searchedUsers = list;
            this.hasMoreUsers = list.length >= this.userSearchPageSize;
          } else {
            this.searchedUsers = [];
            this.hasMoreUsers = false;
          }
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.isSearchingUsers = false;
          this.hasSearchedUsers = true;
          this.searchedUsers = [];
          this.hasMoreUsers = false;
          this.userSearchError =
            typeof err?.error?.message === 'string'
              ? err.error.message
              : 'Erro ao buscar usuários. Verifique o termo digitado.';
          this.cdr.detectChanges();
        },
      });
  }

  clearUserSearch(): void {
    this.userSearchTarget = '';
    this.userSearchError = '';
    this.searchedUsers = [];
    this.hasSearchedUsers = false;
    this.userSearchPage = 1;
    this.hasMoreUsers = false;
    this.cdr.detectChanges();
  }

  changeUserSearchPage(delta: number): void {
    const nextPage = this.userSearchPage + delta;
    if (nextPage < 1) return;
    this.userSearchPage = nextPage;
    this.searchUsers(false);
  }

  copyUserId(userId: string): void {
    if (!userId) return;
    navigator.clipboard?.writeText(userId).then(() => {
      this.copiedUserId = userId;
      this.cdr.detectChanges();
      setTimeout(() => {
        if (this.copiedUserId === userId) {
          this.copiedUserId = null;
          this.cdr.detectChanges();
        }
      }, 2000);
    });
  }

  banUserDirectly(user: UserSummary): void {
    const uAny = user as any;
    const userId = uAny.id || uAny.userId;
    const display = user.displayName || user.userName || userId;

    if (!userId) {
      alert('ID do usuário não encontrado.');
      return;
    }

    const reason = prompt(
      `Informe o motivo do banimento/penalidade para "${display}" (@${user.userName}):`,
    );
    if (reason === null) return;

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      alert('É necessário informar um motivo para aplicar a punição.');
      return;
    }

    const reportPayload: any = {
      title: `Punição Administrativa - @${user.userName}`,
      description: trimmedReason,
      reportType: ReportType.UserReport,
      targetId: userId,
    };

    const reportServiceAny = this.reportService as any;
    if (typeof reportServiceAny.Create === 'function') {
      reportServiceAny.Create(reportPayload).subscribe({
        next: (createRes: ApiResponse<any>) => {
          const createdReportId = createRes?.data?.id || createRes?.data;
          if (createdReportId) {
            this.reportService.PunishUser({ reportId: createdReportId }).subscribe({
              next: (punishRes: ApiResponse<any>) => {
                if (punishRes.success) {
                  alert(`Usuário @${user.userName} banido/penalizado com sucesso!`);
                  this.searchUsers(false);
                }
              },
              error: () => alert('Reporte criado, mas houve falha ao aplicar a punição.'),
            });
          } else {
            alert('Reporte administrativo registrado. Verifique a aba de Reportes.');
          }
        },
        error: () => alert('Erro ao registrar a punição do usuário.'),
      });
    } else {
      this.reportService
        .PunishUser({ reportId: userId, userId, reason: trimmedReason } as any)
        .subscribe({
          next: (res: ApiResponse<any>) => {
            if (res.success) {
              alert(`Usuário @${user.userName} banido/penalizado com sucesso!`);
              this.searchUsers(false);
            }
          },
          error: () => alert('Não foi possível aplicar a punição diretamente.'),
        });
    }
  }

  // ── REPORTES ────────────────────────────────────────────────────
  loadReports(silent = false): void {
    if (!silent) {
      this.isLoadingReports = true;
      this.selectedReport = null;
      this.reports = [];
    }

    this.reportService.GetAll(this.currentPage, this.pageSize, this.showOnlyActive).subscribe({
      next: (res: ApiResponse<any>) => {
        this.reports = res.success && res.data ? res.data.reports || [] : [];
        this.totalOpenReports = res.data?.count || this.reports.length;
        this.isLoadingReports = false;
        if (!this.reports.some((r) => r.id === this.selectedReport?.id)) {
          this.selectedReport = null;
        }

        this.cdr.detectChanges();

        if (!this.selectedReport && this.reports.length > 0) {
          this.selectReport(this.reports[0].id);
        }
      },
      error: (err: unknown) => {
        console.error('[Admin] Erro ao carregar reportes:', err);
        if (!silent) this.reports = [];
        this.isLoadingReports = false;
        this.cdr.detectChanges();
      },
    });
  }

  toggleReportStatusFilter(isActive: boolean): void {
    if (this.showOnlyActive === isActive) return;
    this.showOnlyActive = isActive;
    this.currentPage = 1;
    this.loadReports();
  }

  selectReport(id: string): void {
    this.reportService.GetById(id).subscribe({
      next: (res: ApiResponse<ReportDetail>) => {
        if (res.success && res.data) {
          this.selectedReport = res.data;
          this.cdr.detectChanges();
        }
      },
      error: (err: unknown) => console.error('[Admin] Erro ao carregar reporte:', err),
    });
  }

  punishUser(reportId: string): void {
    if (confirm('Deseja aplicar uma penalidade relacionada a este reporte?')) {
      this.reportService.PunishUser({ reportId }).subscribe({
        next: (res: ApiResponse<any>) => {
          if (res.success) {
            alert('Penalização aplicada com sucesso!');
            this.loadReports();
          }
        },
      });
    }
  }

  closeReport(reportId: string): void {
    if (confirm('Tem certeza de que deseja fechar esta denúncia?')) {
      this.reportService.Close({ reportId }).subscribe({
        next: (res: ApiResponse<any>) => {
          if (res.success) {
            alert('Reporte encerrado com sucesso!');
            this.selectedReport = null;
            this.loadReports();
          }
        },
      });
    }
  }

  // ── GRÁFICOS ────────────────────────────────────────────────────
  loadUserChart(): void {
    this.isLoadingUserChart = true;
    this.userService.GetUserChart(this.startDate, this.endDate).subscribe({
      next: (res: ApiResponse<ChartResponse>) => {
        if (res.success && res.data) {
          this.userChartData = res.data;
          this.userChart = this.buildChart(res.data, 'Novos usuários', '--rpg-purple');
        }
        this.isLoadingUserChart = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingUserChart = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadCharacterChart(): void {
    this.characterService.GetCharacterChart(this.startDate, this.endDate).subscribe({
      next: (res: ApiResponse<ChartResponse>) => {
        if (res.success && res.data) {
          this.characterChartData = res.data;
          this.characterChart = this.buildChart(res.data, 'Novos personagens', '--rpg-purple');
          this.cdr.detectChanges();
        }
      },
      error: (err: unknown) => console.error('[Admin] Erro no gráfico de personagens:', err),
    });
  }

  loadCampaignChart(): void {
    this.campaignService.GetCharacterChart(this.startDate, this.endDate).subscribe({
      next: (res: ApiResponse<ChartResponse>) => {
        if (res.success && res.data) {
          this.campaignChartData = res.data;
          this.campaignChart = this.buildChart(res.data, 'Novas campanhas', '--rpg-purple-dark');
          this.cdr.detectChanges();
        }
      },
      error: (err: unknown) => console.error('[Admin] Erro no gráfico de campanhas:', err),
    });
  }

  private buildChart(res: ChartResponse, label: string, cssVar: string): ChartData<'line'> {
    const color =
      getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() || '#7c3aed';

    const counts = new Map(res.points.map((p) => [`${p.year}-${p.month}`, p.count]));
    const months = this.monthsBetween(this.startDate, this.endDate);

    return {
      labels: months.map((m) => `${String(m.month).padStart(2, '0')}/${m.year}`),
      datasets: [
        {
          label,
          data: months.map((m) => counts.get(`${m.year}-${m.month}`) ?? 0),
          borderColor: color,
          backgroundColor: color + '33',
          pointBackgroundColor: color,
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 3,
          tension: 0.3,
          fill: true,
        },
      ],
    };
  }

  private monthsBetween(start: string, end: string): { year: number; month: number }[] {
    const [sy, sm] = start.split('-').map(Number);
    const [ey, em] = end.split('-').map(Number);

    if (!sy || !sm || !ey || !em) return [];

    const result: { year: number; month: number }[] = [];
    let y = sy;
    let m = sm;

    while ((y < ey || (y === ey && m <= em)) && result.length < 120) {
      result.push({ year: y, month: m });
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }

    return result;
  }
}